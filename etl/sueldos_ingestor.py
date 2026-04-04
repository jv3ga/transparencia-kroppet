"""
ETL — Retribuciones de Altos Cargos
Fuente: https://transparencia.gob.es (scraping HTML)
Destino: CockroachDB (tabla sueldos)

Ejecutar:
    workon transparencia-kroppet
    python etl/sueldos_ingestor.py                  # todos los años (2013-hoy)
    python etl/sueldos_ingestor.py --anyo 2024      # un año concreto
"""

import os
import re
import time
import logging
import argparse
from datetime import date
from decimal import Decimal, InvalidOperation

import requests
import psycopg2
import psycopg2.extras
from lxml import html
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

BASE_URL = (
    "https://transparencia.gob.es/servicios-buscador/buscar.htm"
    "?categoria=retribuciones&categoriasPadre=altcar&lang=es"
)
PAGE_SIZE   = 20   # el portal devuelve 20 por página
SLEEP_S     = 0.5  # entre peticiones
BATCH_SIZE  = 100

# ---------------------------------------------------------------------------
# CockroachDB
# ---------------------------------------------------------------------------
_conn: psycopg2.extensions.connection | None = None

def get_conn() -> psycopg2.extensions.connection:
    global _conn
    if _conn is None or _conn.closed:
        _conn = psycopg2.connect(os.environ["DATABASE_URL"], sslmode="require")
        _conn.autocommit = False
    return _conn


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------
def _clean_retribucion(raw: str) -> float | None:
    """Convierte '95.943,96\xa0€' → 95943.96"""
    raw = raw.replace("\xa0", "").replace(" ", "").replace("€", "")
    raw = raw.replace(".", "").replace(",", ".")
    try:
        return float(Decimal(raw))
    except InvalidOperation:
        return None


def _clean_text(raw: str) -> str:
    """Limpia espacios y anotaciones como (*), (**), (nT)"""
    text = " ".join(raw.split())
    text = re.sub(r"\s*\(\*+\)\s*", "", text)
    text = re.sub(r"\s*\(\d+T\)\s*", "", text)
    text = re.sub(r"\s*\([^)]*\)\s*$", "", text)
    return text.strip()


def parse_page(content: bytes) -> list[dict]:
    tree = html.fromstring(content)

    # La tabla principal con los datos
    rows = tree.cssselect("table.listado tbody tr") or \
           tree.cssselect("table tbody tr") or \
           tree.xpath("//table[contains(@class,'resultado')]//tr[td]")

    records = []
    for row in rows:
        cells = [td.text_content() for td in row.xpath("td")]
        if len(cells) < 4:
            continue
        records.append({
            "alto_cargo":  _clean_text(cells[0]),
            "organismo":   _clean_text(cells[1]),
            "ministerio":  _clean_text(cells[2]),
            "retribucion": _clean_retribucion(cells[3]),
        })
    return records


def get_total_pages(content: bytes) -> int:
    tree = html.fromstring(content)

    # Formato real: "809 Resultados encontrados"
    for t in tree.xpath("//*/text()"):
        m = re.search(r"([\d.]+)\s+[Rr]esultados?\s+encontrados?", t)
        if m:
            total = int(m.group(1).replace(".", ""))
            return max(1, -(-total // PAGE_SIZE))  # ceil division

    # Fallback: máximo número de página encontrado en los links
    nums = []
    for href in tree.xpath("//a[contains(@href,'pag=')]/@href"):
        m = re.search(r"pag=(\d+)", href)
        if m:
            nums.append(int(m.group(1)))
    return max(nums) if nums else 1


# ---------------------------------------------------------------------------
# Upsert
# ---------------------------------------------------------------------------
COLS = ["anyo", "alto_cargo", "organismo", "ministerio", "retribucion"]
UPDATES = ", ".join(f"{c} = EXCLUDED.{c}" for c in COLS if c not in ("anyo", "alto_cargo", "organismo"))

def upsert_batch(cur, rows: list[dict]) -> None:
    if not rows:
        return
    # Deduplicar por clave única (anyo, alto_cargo, organismo) — último gana
    seen: dict[tuple, dict] = {}
    for r in rows:
        key = (r.get("anyo"), r.get("alto_cargo"), r.get("organismo"))
        seen[key] = r
    values = [[r.get(c) for c in COLS] for r in seen.values()]
    psycopg2.extras.execute_values(
        cur,
        f"""
        INSERT INTO sueldos ({", ".join(COLS)})
        VALUES %s
        ON CONFLICT (anyo, alto_cargo, organismo) DO UPDATE SET {UPDATES}
        """,
        values,
        page_size=200,
    )


# ---------------------------------------------------------------------------
# Fetch con reintentos
# ---------------------------------------------------------------------------
def fetch(url: str, retries: int = 4) -> bytes:
    for attempt in range(retries):
        try:
            resp = requests.get(url, timeout=30, headers={
                "User-Agent": "transparencia-kroppet/1.0",
                "Accept-Language": "es-ES,es;q=0.9",
            })
            resp.raise_for_status()
            return resp.content
        except (requests.Timeout, requests.ConnectionError) as e:
            if attempt == retries - 1:
                raise
            wait = (attempt + 1) * 5
            log.warning("Error (intento %d/%d), reintentando en %ds: %s", attempt + 1, retries, wait, e)
            time.sleep(wait)


# ---------------------------------------------------------------------------
# Ingest por año
# ---------------------------------------------------------------------------
def ingest_anyo(anyo: int) -> int:
    log.info("=== Año %d ===", anyo)
    conn = get_conn()
    cur  = conn.cursor()
    batch: list[dict] = []
    total = 0

    try:
        # Primera página para obtener total
        url_base = f"{BASE_URL}&anyo={anyo}"
        content  = fetch(f"{url_base}&pag=1")
        n_pages  = get_total_pages(content)
        records_p1 = parse_page(content)
        log.info("Año %d — %d páginas | %d registros en pág 1", anyo, n_pages, len(records_p1))

        for pag in range(1, n_pages + 1):
            if pag > 1:
                content = fetch(f"{url_base}&pag={pag}")
                time.sleep(SLEEP_S)

            records = parse_page(content)
            if not records:
                log.warning("Año %d pág %d — sin registros, parando", anyo, pag)
                break

            for r in records:
                r["anyo"] = anyo
                batch.append(r)

            total += len(records)

            if len(batch) >= BATCH_SIZE:
                upsert_batch(cur, batch)
                conn.commit()
                batch = []
                log.info("Año %d — pág %d/%d | total: %d", anyo, pag, n_pages, total)

        if batch:
            upsert_batch(cur, batch)
            conn.commit()

        log.info("Año %d finalizado — %d registros", anyo, total)
        return total

    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingestor sueldos altos cargos → CockroachDB")
    parser.add_argument("--anyo", type=int, default=None,
                        help="Año concreto (default: todos desde 2013 hasta hoy)")
    parser.add_argument("--desde", type=int, default=2013,
                        help="Año inicio del rango (default: 2013)")
    args = parser.parse_args()

    if args.anyo:
        anyos = [args.anyo]
    else:
        anyos = list(range(args.desde, date.today().year + 1))

    grand_total = 0
    for a in anyos:
        grand_total += ingest_anyo(a)

    log.info("Ingesta completa — %d registros totales", grand_total)
