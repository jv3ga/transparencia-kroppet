"""
ETL — Plataforma de Contratación del Estado (PLACE)
Fuente: https://contrataciondelestado.es (feeds Atom paginados)
Destino: Supabase (tablas organos, empresas, contratos)

Ejecutar:
    pip install -r requirements.txt
    cp .env.example .env   # y rellenar con las keys de Supabase
    python place_ingestor.py --pages 5
"""

import os
import json
import logging
from datetime import datetime
from decimal import Decimal, InvalidOperation

import requests
from lxml import etree
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Namespaces reales del feed PLACE (obtenidos del XML)
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

# Códigos de tipo de contrato PLACE → texto legible
TIPO_CONTRATO = {
    "1": "suministros",
    "2": "servicios",
    "3": "obras",
    "4": "concesion_obras",
    "5": "concesion_servicios",
    "7": "administrativo_especial",
    "8": "privado",
    "9": "patrimonial",
    "21": "servicios_especiales",
    "31": "obras_publicas",
    "40": "colaboracion_publico_privada",
    "50": "mixto",
    "99": "otros",
}

# Códigos de procedimiento PLACE → texto legible
PROCEDIMIENTO = {
    "1": "abierto",
    "2": "restringido",
    "3": "negociado_con_publicidad",
    "4": "negociado_sin_publicidad",
    "5": "dialogo_competitivo",
    "6": "concurso_proyectos",
    "7": "licitacion_con_negociacion",
    "8": "asociacion_innovacion",
    "9": "simplificado_abreviado",
    "14": "emergencia",
    "20": "concesion",
    "100": "basado_acuerdo_marco",
    "200": "sistema_dinamico",
    "999": "otros",
}


# ---------------------------------------------------------------------------
# Supabase — cliente con retry ante cierre HTTP/2 (~10k streams)
# ---------------------------------------------------------------------------
_sb: Client | None = None

def get_supabase() -> Client:
    global _sb
    url = os.environ["SUPABASE_URL"]
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ["SUPABASE_SERVICE_KEY"]
    _sb = create_client(url, key)
    return _sb

def _retry(fn, retries: int = 3):
    """Ejecuta fn(); si cae por ConnectionTerminated recrea el cliente y reintenta."""
    import httpx
    global _sb
    for attempt in range(retries):
        try:
            return fn()
        except (httpx.RemoteProtocolError, httpx.ReadError):
            if attempt == retries - 1:
                raise
            log.warning("HTTP/2 connection terminated, recreating client (attempt %d)", attempt + 1)
            _sb = get_supabase()

# Cachés en memoria para reducir upserts repetidos (~80% de organos/empresas se repiten)
_organo_cache: dict[str, int] = {}
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

    # Órgano de contratación
    organo_nombre   = _text(entry, f"{cfs}/cac_ext:LocatedContractingParty/cac:Party/cac:PartyName/cbc:Name/text()")
    organo_nif      = _text(entry, f"{cfs}/cac_ext:LocatedContractingParty/cac:Party/cac:PartyIdentification[cbc:ID/@schemeName='NIF']/cbc:ID/text()")
    organo_dir3     = _text(entry, f"{cfs}/cac_ext:LocatedContractingParty/cac:Party/cac:PartyIdentification[cbc:ID/@schemeName='DIR3']/cbc:ID/text()")
    organo_codigo   = organo_dir3 or organo_nif  # DIR3 es más estable

    # Proyecto / tipo
    tipo_code       = _text(entry, f"{cfs}/cac:ProcurementProject/cbc:TypeCode/text()")
    tipo_contrato   = TIPO_CONTRATO.get(tipo_code, tipo_code)

    # Procedimiento
    proc_code       = _text(entry, f"{cfs}/cac:TenderingProcess/cbc:ProcedureCode/text()")
    procedimiento   = PROCEDIMIENTO.get(proc_code, proc_code)

    # Importes (del BudgetAmount del proyecto)
    importe_sin_iva = _decimal(entry, f"{cfs}/cac:ProcurementProject/cac:BudgetAmount/cbc:TaxExclusiveAmount/text()")
    importe_con_iva = _decimal(entry, f"{cfs}/cac:ProcurementProject/cac:BudgetAmount/cbc:TotalAmount/text()")

    # Empresa adjudicataria (solo en estado ADJ/RES)
    empresa_nif     = _text(entry, f"{cfs}/cac:TenderResult/cac:WinningParty/cac:PartyIdentification[cbc:ID/@schemeName='NIF']/cbc:ID/text()")
    empresa_nombre  = _text(entry, f"{cfs}/cac:TenderResult/cac:WinningParty/cac:PartyName/cbc:Name/text()")

    # Importe adjudicación (más preciso cuando está disponible)
    importe_adj     = _decimal(entry, f"{cfs}/cac:TenderResult/cac:AwardedTenderedProject/cac:LegalMonetaryTotal/cbc:TaxExclusiveAmount/text()")
    if importe_adj:
        importe_sin_iva = importe_adj

    # Fechas
    fecha_adj       = _date(entry, f"{cfs}/cac:TenderResult/cbc:AwardDate/text()")
    fecha_pub       = _date(entry, "atom:updated/text()")

    # URL
    url_fuente = None
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
        "raw_data":           etree.tostring(entry, encoding="unicode"),
    }


# ---------------------------------------------------------------------------
# Upserts en Supabase
# ---------------------------------------------------------------------------
def upsert_organo(sb: Client, codigo: str, nombre: str) -> int | None:
    if not codigo or not nombre:
        return None
    if codigo in _organo_cache:
        return _organo_cache[codigo]
    res = _retry(lambda: sb.table("organos")
                           .upsert({"codigo": codigo, "nombre": nombre}, on_conflict="codigo")
                           .execute())
    oid = res.data[0]["id"] if res.data else None
    if oid:
        _organo_cache[codigo] = oid
    return oid


def upsert_empresa(sb: Client, nif: str, nombre: str) -> int | None:
    if not nif or not nombre:
        return None
    if nif in _empresa_cache:
        return _empresa_cache[nif]
    res = _retry(lambda: sb.table("empresas")
                           .upsert({"nif": nif, "nombre": nombre}, on_conflict="nif")
                           .execute())
    eid = res.data[0]["id"] if res.data else None
    if eid:
        _empresa_cache[nif] = eid
    return eid


def upsert_contrato(sb: Client, row: dict) -> None:
    if row.get("expediente"):
        _retry(lambda: sb.table("contratos").upsert(row, on_conflict="expediente").execute())
    else:
        _retry(lambda: sb.table("contratos").insert(row).execute())


# ---------------------------------------------------------------------------
# Fetch feed paginado
# ---------------------------------------------------------------------------
def fetch_feed(url: str) -> tuple[list, str | None]:
    log.info("Fetching %s", url)
    resp = requests.get(url, timeout=30, headers={"User-Agent": "transparencia-kroppet/1.0"})
    resp.raise_for_status()

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
def ingest(max_pages: int | None = 5) -> None:
    """
    Ingesta páginas del feed de PLACE.
    max_pages=None procesa todo (lento en primera ejecución: ~300k contratos).
    """
    sb = get_supabase()
    url = BASE_FEED_URL
    page = 0
    total = 0
    skipped = 0

    while url and (max_pages is None or page < max_pages):
        entries, next_url = fetch_feed(url)
        log.info("Página %d — %d entradas", page + 1, len(entries))

        for entry in entries:
            parsed = parse_entry(entry)
            if not parsed:
                skipped += 1
                continue

            organo_id  = upsert_organo(_sb, parsed["organo_codigo"], parsed["organo_nombre"])
            empresa_id = upsert_empresa(_sb, parsed["empresa_nif"], parsed["empresa_nombre"])

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
                "raw_data":           json.dumps({"xml": parsed["raw_data"]}),
            }
            upsert_contrato(_sb, contrato)
            total += 1

        log.info("Insertados: %d | Saltados: %d", total, skipped)
        url = next_url
        page += 1

    log.info("Ingesta finalizada. Total: %d | Saltados: %d", total, skipped)


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Ingestor PLACE → Supabase")
    parser.add_argument(
        "--pages",
        type=int,
        default=5,
        help="Páginas a procesar (default: 5, 0 = todas)",
    )
    args = parser.parse_args()
    ingest(max_pages=args.pages or None)
