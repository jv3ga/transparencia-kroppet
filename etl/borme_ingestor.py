"""
ETL: BORME Sección Primera — administradores de empresas
=========================================================
Descarga PDFs diarios del BORME, extrae nombramientos y ceses de administradores
y los cruza con la tabla `empresas` por nombre normalizado.

Uso:
    python etl/borme_ingestor.py --desde 2024-01-01 --hasta 2024-12-31
    python etl/borme_ingestor.py --fecha 2025-01-03
    python etl/borme_ingestor.py --days 30          # últimos N días
"""

import argparse
import io
import re
import time
import unicodedata
from datetime import date, timedelta, datetime

import psycopg2
import psycopg2.extras
import requests
from dotenv import load_dotenv
import os

from pdfminer.high_level import extract_text

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
SUMARIO_URL  = "https://www.boe.es/datosabiertos/api/borme/sumario/{fecha}"
SESSION      = requests.Session()
SESSION.headers["User-Agent"] = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
SESSION.headers["Accept"] = "application/json"


# ---------------------------------------------------------------------------
# Normalización de nombres
# ---------------------------------------------------------------------------

def normalizar(nombre: str) -> str:
    """CORTIJO CUEVAS S.L. -> CORTIJO CUEVAS SL"""
    s = nombre.upper().strip()
    # Quitar tildes
    s = "".join(c for c in unicodedata.normalize("NFD", s)
                if unicodedata.category(c) != "Mn")
    # Quitar puntos y comas
    s = re.sub(r"[.,;]", "", s)
    # Colapsar espacios
    s = re.sub(r"\s+", " ", s).strip()
    return s


# ---------------------------------------------------------------------------
# Descarga del sumario y PDFs
# ---------------------------------------------------------------------------

def get_pdf_urls(fecha: date) -> list[str]:
    """Devuelve las URLs de los PDFs de Sección Primera para una fecha."""
    url = SUMARIO_URL.format(fecha=fecha.strftime("%Y%m%d"))
    try:
        r = SESSION.get(url, timeout=30)
        r.raise_for_status()
    except Exception as e:
        print(f"  [WARN] sumario {fecha}: {e}")
        return []

    data = r.json()
    diarios = data.get("data", {}).get("sumario", {}).get("diario", [])
    if not isinstance(diarios, list):
        diarios = [diarios]

    urls = []
    for diario in diarios:
        secciones = diario.get("seccion", [])
        if not isinstance(secciones, list):
            secciones = [secciones]
        for seccion in secciones:
            if seccion.get("codigo") != "A":
                continue
            items = seccion.get("item", [])
            if not isinstance(items, list):
                items = [items]
            for item in items:
                pdf = item.get("url_pdf", {}).get("texto")
                if pdf:
                    urls.append(pdf)
    return urls


def download_pdf_text(url: str) -> str:
    """Descarga un PDF BORME y devuelve su texto."""
    r = SESSION.get(url, timeout=60)
    r.raise_for_status()
    return extract_text(io.BytesIO(r.content))


# ---------------------------------------------------------------------------
# Parser de texto BORME
# ---------------------------------------------------------------------------

# Roles que indican administradores (no apoderados genéricos)
ROLES_ADMIN = {
    r"Adm\.\s*[Uu]nico":       "Adm. Único",
    r"Adm\.\s*[Ss]olid\.?":    "Adm. Solidario",
    r"Adm\.\s*[Mm]ancom\.?":   "Adm. Mancomunado",
    r"[Cc]ons\.\s*[Dd]el\.?":  "Consejero Delegado",
    r"[Ll]iquidador":          "Liquidador",
    r"[Aa]poderado":           "Apoderado",
}
ROLE_PATTERN = re.compile(
    r"(" + "|".join(ROLES_ADMIN.keys()) + r"):\s*([^.]+)\.",
    re.IGNORECASE
)

# Cabeceras de actos
NOMBRAMIENTOS_RE = re.compile(r"\bNombramientos\b", re.IGNORECASE)
CESES_RE         = re.compile(r"\bCeses[/\\]?Dimisiones\b|\bRevocaciones\b", re.IGNORECASE)

# Entrada de empresa: número - NOMBRE EMPRESA.
ENTRY_RE = re.compile(r"^\s*(\d{1,6})\s*-\s*([A-ZÁÉÍÓÚÑÜ\w][^.]{2,100})\.\s*$", re.MULTILINE)

# Hoja registral: H M 510882 o H B 12345
HOJA_RE = re.compile(r"\bH\s+([A-Z]{1,2}\s+\d+)", re.IGNORECASE)


def parse_admins(text_fragment: str, tipo_acto: str) -> list[dict]:
    """Extrae (administrador, cargo, tipo_acto) de un fragmento de texto."""
    results = []
    for m in ROLE_PATTERN.finditer(text_fragment):
        raw_role = m.group(1).strip()
        raw_name = m.group(2).strip()

        # Normalizar rol
        cargo = raw_role
        for pattern, label in ROLES_ADMIN.items():
            if re.match(pattern, raw_role, re.IGNORECASE):
                cargo = label
                break

        # Puede haber varios nombres separados por "." dentro del mismo rol
        # ej: "Adm. Solid.: GARCIA LOPEZ PEDRO. MARTINEZ RUIZ ANA."
        # El regex ya captura hasta el primer punto, así que tomamos tal cual
        # Limpiar caracteres raros
        nombre = re.sub(r"\s+", " ", raw_name).strip()
        if len(nombre) > 3:
            results.append({
                "administrador": nombre,
                "cargo":         cargo,
                "tipo_acto":     tipo_acto,
            })
    return results


def parse_borme_text(text: str, fecha: date) -> list[dict]:
    """
    Parsea el texto completo de un PDF BORME y devuelve una lista de registros
    {empresa_nombre, hoja, administrador, cargo, tipo_acto, fecha_publicacion}.
    """
    records = []

    # Dividir en entradas de empresa
    matches = list(ENTRY_RE.finditer(text))
    if not matches:
        return records

    for i, m in enumerate(matches):
        empresa_nombre = m.group(2).strip()
        # Texto de esta entrada hasta la siguiente
        start = m.end()
        end   = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body  = text[start:end]

        # Hoja registral
        hoja_m = HOJA_RE.search(body)
        hoja   = hoja_m.group(1).strip() if hoja_m else None

        # Buscar bloques de actos
        admins = []

        # Nombramientos
        for nm in NOMBRAMIENTOS_RE.finditer(body):
            # Tomar texto desde el acto hasta el siguiente punto de datos registrales o acto
            fragment = body[nm.end():nm.end() + 400]
            admins += parse_admins(fragment, "nombramiento")

        # Ceses / Revocaciones
        for cm in CESES_RE.finditer(body):
            fragment = body[cm.end():cm.end() + 400]
            admins += parse_admins(fragment, "cese")

        for a in admins:
            records.append({
                "fecha_publicacion": fecha,
                "empresa_nombre":    empresa_nombre,
                "hoja":              hoja,
                **a,
            })

    return records


# ---------------------------------------------------------------------------
# Matching con empresas y upsert
# ---------------------------------------------------------------------------

def match_empresas(cur, records: list[dict]) -> list[dict]:
    """Añade empresa_id a los registros que hacen match por nombre_norm."""
    nombres = list({normalizar(r["empresa_nombre"]) for r in records})
    if not nombres:
        return records

    cur.execute(
        "SELECT id, nombre_norm FROM empresas WHERE nombre_norm = ANY(%s)",
        (nombres,)
    )
    mapping = {row[1]: row[0] for row in cur.fetchall()}

    for r in records:
        r["empresa_id"] = mapping.get(normalizar(r["empresa_nombre"]))

    return records


def upsert_records(cur, records: list[dict]) -> tuple[int, int]:
    """Inserta registros deduplicados. Devuelve (insertados, con_match)."""
    if not records:
        return 0, 0

    # Deduplicar por clave única
    seen = {}
    for r in records:
        key = (r["fecha_publicacion"], r["empresa_nombre"],
               r["administrador"], r["cargo"], r["tipo_acto"])
        seen[key] = r
    deduped = list(seen.values())

    cols = ["fecha_publicacion", "empresa_nombre", "empresa_id",
            "hoja", "administrador", "cargo", "tipo_acto"]
    values = [[r.get(c) for c in cols] for r in deduped]

    psycopg2.extras.execute_values(cur, f"""
        INSERT INTO borme_administradores ({', '.join(cols)})
        VALUES %s
        ON CONFLICT (fecha_publicacion, empresa_nombre, administrador, cargo, tipo_acto)
        DO UPDATE SET
          empresa_id = EXCLUDED.empresa_id,
          hoja       = EXCLUDED.hoja
    """, values)

    con_match = sum(1 for r in deduped if r.get("empresa_id"))
    return len(deduped), con_match


# ---------------------------------------------------------------------------
# Bucle principal
# ---------------------------------------------------------------------------

def process_date(cur, fecha: date) -> tuple[int, int, int]:
    """Procesa todos los PDFs de una fecha. Devuelve (pdfs, registros, matches)."""
    urls = get_pdf_urls(fecha)
    if not urls:
        return 0, 0, 0

    total_recs = total_matches = 0

    for url in urls:
        try:
            text    = download_pdf_text(url)
            records = parse_borme_text(text, fecha)
            records = match_empresas(cur, records)
            recs, matches = upsert_records(cur, records)
            total_recs    += recs
            total_matches += matches
            time.sleep(0.5)
        except Exception as e:
            print(f"    [ERROR] {url}: {e}")

    return len(urls), total_recs, total_matches


def date_range(desde: date, hasta: date):
    d = desde
    while d <= hasta:
        # BORME se publica lunes-viernes
        if d.weekday() < 5:
            yield d
        d += timedelta(days=1)


def main():
    parser = argparse.ArgumentParser()
    group  = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--fecha",  help="Fecha única YYYY-MM-DD")
    group.add_argument("--desde",  help="Inicio rango YYYY-MM-DD (usar con --hasta)")
    group.add_argument("--days",   type=int, help="Últimos N días")
    parser.add_argument("--hasta", help="Fin rango YYYY-MM-DD")
    args = parser.parse_args()

    if args.fecha:
        fechas = [datetime.strptime(args.fecha, "%Y-%m-%d").date()]
    elif args.days:
        hoy    = date.today()
        fechas = list(date_range(hoy - timedelta(days=args.days), hoy))
    else:
        desde  = datetime.strptime(args.desde, "%Y-%m-%d").date()
        hasta  = datetime.strptime(args.hasta, "%Y-%m-%d").date()
        fechas = list(date_range(desde, hasta))

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur  = conn.cursor()

    total_recs = total_matches = 0

    for fecha in fechas:
        pdfs, recs, matches = process_date(cur, fecha)
        if pdfs:
            conn.commit()
            print(f"{fecha}  PDFs={pdfs}  registros={recs}  matches={matches}")
            total_recs    += recs
            total_matches += matches
        else:
            print(f"{fecha}  (sin publicación)")
        time.sleep(1)

    cur.close()
    conn.close()
    print(f"\nTotal: {total_recs} registros, {total_matches} con empresa vinculada")


if __name__ == "__main__":
    main()
