"""
ETL — Plataforma de Contratación del Estado (PLACE)
Fuente: https://contrataciondelestado.es (feeds Atom paginados)
Destino: CockroachDB (tablas organos, empresas, contratos)

Ejecutar:
    pip install -r requirements.txt
    cp .env.example .env   # y rellenar con DATABASE_URL
    python place_ingestor.py --pages 5
"""

import os
import json
import logging
import time
from datetime import datetime
from decimal import Decimal, InvalidOperation

import requests
import psycopg2
import psycopg2.extras
from lxml import etree
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Namespaces reales del feed PLACE
# ---------------------------------------------------------------------------
NS = {
    "atom":     "http://www.w3.org/2005/Atom",
    "cbc":      "urn:dgpe:names:draft:codice:schema:xsd:CommonBasicComponents-2",
    "cac":      "urn:dgpe:names:draft:codice:schema:xsd:CommonAggregateComponents-2",
    "cac_ext":  "urn:dgpe:names:draft:codice-place-ext:schema:xsd:CommonAggregateComponents-2",
    "cbc_ext":  "urn:dgpe:names:draft:codice-place-ext:schema:xsd:CommonBasicComponents-2",
}

BASE_FEED_URL = (
    "https://contrataciondelestado.es/sindicacion/sindicacion_643/"
    "licitacionesPerfilesContratanteCompleto3.atom"
)

TIPO_CONTRATO = {
    "1": "suministros", "2": "servicios", "3": "obras",
    "4": "concesion_obras", "5": "concesion_servicios",
    "7": "administrativo_especial", "8": "privado", "9": "patrimonial",
    "21": "servicios_especiales", "31": "obras_publicas",
    "40": "colaboracion_publico_privada", "50": "mixto", "99": "otros",
}

PROCEDIMIENTO = {
    "1": "abierto", "2": "restringido", "3": "negociado_con_publicidad",
    "4": "negociado_sin_publicidad", "5": "dialogo_competitivo",
    "6": "concurso_proyectos", "7": "licitacion_con_negociacion",
    "8": "asociacion_innovacion", "9": "simplificado_abreviado",
    "14": "emergencia", "20": "concesion", "100": "basado_acuerdo_marco",
    "200": "sistema_dinamico", "999": "otros",
}

# ---------------------------------------------------------------------------
# CockroachDB — conexión
# ---------------------------------------------------------------------------
_conn: psycopg2.extensions.connection | None = None

def get_conn() -> psycopg2.extensions.connection:
    global _conn
    if _conn is None or _conn.closed:
        _conn = psycopg2.connect(
            os.environ["DATABASE_URL"],
            sslmode="require",
        )
        _conn.autocommit = False
    return _conn


# Cachés en memoria para reducir upserts repetidos
_organo_cache:  dict[str, int] = {}
_empresa_cache: dict[str, int] = {}


# ---------------------------------------------------------------------------
# Helpers de parsing
# ---------------------------------------------------------------------------
def _text(el, xpath: str) -> str | None:
    nodes = el.xpath(xpath, namespaces=NS)
    if not nodes:
        return None
    val = nodes[0]
    return val.strip() if isinstance(val, str) else val.text.strip() if val.text else None


def _decimal(el, xpath: str) -> float | None:
    raw = _text(el, xpath)
    if raw is None:
        return None
    try:
        return float(Decimal(raw.replace(",", ".")))
    except InvalidOperation:
        return None


def _date(el, xpath: str) -> str | None:
    raw = _text(el, xpath)
    if not raw:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw[:len(fmt)], fmt).date().isoformat()
        except ValueError:
            continue
    return raw[:10] if len(raw) >= 10 else None


# ---------------------------------------------------------------------------
# Parsear un <entry> del feed
# ---------------------------------------------------------------------------
def parse_entry(entry: etree._Element) -> dict | None:
    objeto = _text(entry, "atom:title/text()")
    if not objeto:
        return None

    cfs = ".//cac_ext:ContractFolderStatus"

    expediente      = _text(entry, f"{cfs}/cbc:ContractFolderID/text()")
    estado_code     = _text(entry, f"{cfs}/cbc_ext:ContractFolderStatusCode/text()")
    organo_nombre   = _text(entry, f"{cfs}/cac_ext:LocatedContractingParty/cac:Party/cac:PartyName/cbc:Name/text()")
    organo_nif      = _text(entry, f"{cfs}/cac_ext:LocatedContractingParty/cac:Party/cac:PartyIdentification[cbc:ID/@schemeName='NIF']/cbc:ID/text()")
    organo_dir3     = _text(entry, f"{cfs}/cac_ext:LocatedContractingParty/cac:Party/cac:PartyIdentification[cbc:ID/@schemeName='DIR3']/cbc:ID/text()")
    organo_codigo   = organo_dir3 or organo_nif
    tipo_code       = _text(entry, f"{cfs}/cac:ProcurementProject/cbc:TypeCode/text()")
    tipo_contrato   = TIPO_CONTRATO.get(tipo_code, tipo_code)
    proc_code       = _text(entry, f"{cfs}/cac:TenderingProcess/cbc:ProcedureCode/text()")
    procedimiento   = PROCEDIMIENTO.get(proc_code, proc_code)
    importe_sin_iva = _decimal(entry, f"{cfs}/cac:ProcurementProject/cac:BudgetAmount/cbc:TaxExclusiveAmount/text()")
    importe_con_iva = _decimal(entry, f"{cfs}/cac:ProcurementProject/cac:BudgetAmount/cbc:TotalAmount/text()")
    empresa_nif     = _text(entry, f"{cfs}/cac:TenderResult/cac:WinningParty/cac:PartyIdentification[cbc:ID/@schemeName='NIF']/cbc:ID/text()")
    empresa_nombre  = _text(entry, f"{cfs}/cac:TenderResult/cac:WinningParty/cac:PartyName/cbc:Name/text()")
    importe_adj     = _decimal(entry, f"{cfs}/cac:TenderResult/cac:AwardedTenderedProject/cac:LegalMonetaryTotal/cbc:TaxExclusiveAmount/text()")
    if importe_adj:
        importe_sin_iva = importe_adj
    fecha_adj       = _date(entry, f"{cfs}/cac:TenderResult/cbc:AwardDate/text()")
    fecha_pub       = _date(entry, "atom:updated/text()")
    url_fuente      = None
    for link in entry.findall("atom:link", NS):
        url_fuente = link.get("href")
        break

    return {
        "expediente":         expediente,
        "objeto":             objeto,
        "tipo_contrato":      tipo_contrato,
        "procedimiento":      procedimiento,
        "importe_sin_iva":    importe_sin_iva,
        "importe_con_iva":    importe_con_iva,
        "empresa_nif":        empresa_nif,
        "empresa_nombre":     empresa_nombre,
        "organo_codigo":      organo_codigo,
        "organo_nombre":      organo_nombre,
        "fecha_adjudicacion": fecha_adj,
        "fecha_publicacion":  fecha_pub,
        "estado":             estado_code,
        "url_fuente":         url_fuente,
        "raw_data":           json.dumps({"xml": etree.tostring(entry, encoding="unicode")}),
    }


# ---------------------------------------------------------------------------
# Upserts en CockroachDB
# ---------------------------------------------------------------------------
def upsert_organo(cur, codigo: str, nombre: str) -> int | None:
    if not codigo or not nombre:
        return None
    if codigo in _organo_cache:
        return _organo_cache[codigo]
    cur.execute(
        """
        INSERT INTO organos (codigo, nombre)
        VALUES (%s, %s)
        ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre
        RETURNING id
        """,
        (codigo, nombre),
    )
    oid = cur.fetchone()[0]
    _organo_cache[codigo] = oid
    return oid


def upsert_empresa(cur, nif: str, nombre: str) -> int | None:
    if not nif or not nombre:
        return None
    if nif in _empresa_cache:
        return _empresa_cache[nif]
    cur.execute(
        """
        INSERT INTO empresas (nif, nombre)
        VALUES (%s, %s)
        ON CONFLICT (nif) DO UPDATE SET nombre = EXCLUDED.nombre
        RETURNING id
        """,
        (nif, nombre),
    )
    eid = cur.fetchone()[0]
    _empresa_cache[nif] = eid
    return eid


def upsert_contrato(cur, row: dict) -> None:
    cols = ["expediente", "objeto", "tipo_contrato", "procedimiento",
            "importe_sin_iva", "importe_con_iva", "empresa_id", "organo_id",
            "fecha_adjudicacion", "fecha_publicacion", "estado", "url_fuente", "raw_data"]
    vals = [row.get(c) for c in cols]
    placeholders = ", ".join(["%s"] * len(cols))
    updates = ", ".join([f"{c} = EXCLUDED.{c}" for c in cols if c != "expediente"])

    if row.get("expediente"):
        cur.execute(
            f"""
            INSERT INTO contratos ({", ".join(cols)})
            VALUES ({placeholders})
            ON CONFLICT (expediente) WHERE expediente IS NOT NULL
            DO UPDATE SET {updates}
            """,
            vals,
        )
    else:
        cur.execute(
            f"INSERT INTO contratos ({', '.join(cols)}) VALUES ({placeholders})",
            vals,
        )


# ---------------------------------------------------------------------------
# Fetch feed paginado
# ---------------------------------------------------------------------------
def fetch_feed(url: str, retries: int = 4) -> tuple[list, str | None]:
    log.info("Fetching %s", url)
    for attempt in range(retries):
        try:
            resp = requests.get(url, timeout=90, headers={"User-Agent": "transparencia-kroppet/1.0"})
            resp.raise_for_status()
            break
        except (requests.Timeout, requests.ConnectionError) as e:
            if attempt == retries - 1:
                raise
            wait = (attempt + 1) * 10
            log.warning("Timeout/error (intento %d), reintentando en %ds: %s", attempt + 1, wait, e)
            time.sleep(wait)

    root = etree.fromstring(resp.content)
    entries = root.findall("atom:entry", NS)
    next_url = None
    for link in root.findall("atom:link", NS):
        if link.get("rel") == "next":
            next_url = link.get("href")
            break
    return entries, next_url


# ---------------------------------------------------------------------------
# Ingesta principal
# ---------------------------------------------------------------------------
BATCH_SIZE = 50  # commit cada N contratos

def ingest(max_pages: int | None = 5) -> None:
    conn = get_conn()
    cur = conn.cursor()
    url = BASE_FEED_URL
    page = 0
    total = 0
    skipped = 0

    try:
        while url and (max_pages is None or page < max_pages):
            entries, next_url = fetch_feed(url)
            log.info("Página %d — %d entradas", page + 1, len(entries))

            for entry in entries:
                parsed = parse_entry(entry)
                if not parsed:
                    skipped += 1
                    continue

                organo_id  = upsert_organo(cur, parsed["organo_codigo"], parsed["organo_nombre"])
                empresa_id = upsert_empresa(cur, parsed["empresa_nif"], parsed["empresa_nombre"])

                contrato = {
                    "expediente":         parsed["expediente"],
                    "objeto":             parsed["objeto"],
                    "tipo_contrato":      parsed["tipo_contrato"],
                    "procedimiento":      parsed["procedimiento"],
                    "importe_sin_iva":    parsed["importe_sin_iva"],
                    "importe_con_iva":    parsed["importe_con_iva"],
                    "empresa_id":         empresa_id,
                    "organo_id":          organo_id,
                    "fecha_adjudicacion": parsed["fecha_adjudicacion"],
                    "fecha_publicacion":  parsed["fecha_publicacion"],
                    "estado":             parsed["estado"],
                    "url_fuente":         parsed["url_fuente"],
                    "raw_data":           parsed["raw_data"],
                }
                upsert_contrato(cur, contrato)
                total += 1

                if total % BATCH_SIZE == 0:
                    conn.commit()
                    log.info("Commit — insertados: %d | saltados: %d", total, skipped)

            url = next_url
            page += 1

        conn.commit()
        log.info("Ingesta finalizada. Total: %d | Saltados: %d", total, skipped)

    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Ingestor PLACE → CockroachDB")
    parser.add_argument("--pages", type=int, default=5,
                        help="Páginas a procesar (default: 5, 0 = todas)")
    args = parser.parse_args()
    ingest(max_pages=args.pages or None)
