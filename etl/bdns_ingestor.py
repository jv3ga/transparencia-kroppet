"""
ETL — Base de Datos Nacional de Subvenciones (BDNS)
Fuente: https://www.infosubvenciones.es/bdnstrans/api
Destino: Supabase (tabla subvenciones)

Ejecutar:
    workon transparencia-kroppet
    python etl/bdns_ingestor.py --days 7          # últimos 7 días (cron diario)
    python etl/bdns_ingestor.py --desde 01/01/2024 --hasta 31/12/2024
"""

import os
import time
import logging
import argparse
from datetime import date, timedelta, datetime

import requests
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

BASE_URL = "https://www.infosubvenciones.es/bdnstrans/api/concesiones/busqueda"
PAGE_SIZE = 500
RATE_LIMIT_SLEEP = 0.3  # segundos entre peticiones (máx 5 req/s)

# ---------------------------------------------------------------------------
# Supabase
# ---------------------------------------------------------------------------
_sb: Client | None = None

def get_supabase() -> Client:
    global _sb
    url = os.environ["SUPABASE_URL"]
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ["SUPABASE_SERVICE_KEY"]
    _sb = create_client(url, key)
    return _sb

# ---------------------------------------------------------------------------
# Fetch
# ---------------------------------------------------------------------------
def fetch_page(fecha_desde: str, fecha_hasta: str, page: int) -> dict:
    """Fetcha una página de concesiones BDNS. Fechas en formato dd/mm/yyyy."""
    resp = requests.get(BASE_URL, params={
        "page":       page,
        "pageSize":   PAGE_SIZE,
        "fechaDesde": fecha_desde,
        "fechaHasta": fecha_hasta,
    }, timeout=30, headers={"Accept": "application/json"})
    resp.raise_for_status()
    return resp.json()

# ---------------------------------------------------------------------------
# Transform
# ---------------------------------------------------------------------------
def transform(raw: dict) -> dict:
    def _date(val) -> str | None:
        if not val:
            return None
        for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
            try:
                return datetime.strptime(val, fmt).date().isoformat()
            except ValueError:
                continue
        return None

    return {
        "id":               raw.get("id"),
        "cod_concesion":    raw.get("codConcesion"),
        "fecha_concesion":  _date(raw.get("fechaConcesion")),
        "beneficiario":     raw.get("beneficiario"),
        "instrumento":      raw.get("instrumento"),
        "importe":          raw.get("importe"),
        "ayuda_equivalente": raw.get("ayudaEquivalente"),
        "convocatoria":     raw.get("convocatoria"),
        "id_convocatoria":  raw.get("idConvocatoria"),
        "num_convocatoria": raw.get("numeroConvocatoria"),
        "nivel1":           raw.get("nivel1"),
        "nivel2":           raw.get("nivel2"),
        "nivel3":           raw.get("nivel3"),
        "url_br":           raw.get("urlBR"),
        "tiene_proyecto":   raw.get("tieneProyecto"),
        "fecha_alta":       _date(raw.get("fechaAlta")),
    }

# ---------------------------------------------------------------------------
# Ingest
# ---------------------------------------------------------------------------
def ingest(fecha_desde: str, fecha_hasta: str) -> None:
    """
    Ingesta concesiones BDNS entre dos fechas (formato dd/mm/yyyy).
    Usa upsert por id para ser idempotente.
    """
    sb = get_supabase()
    log.info("Ingesta BDNS del %s al %s", fecha_desde, fecha_hasta)

    page = 0
    total_pages = None
    total_inserted = 0

    while True:
        try:
            data = fetch_page(fecha_desde, fecha_hasta, page)
        except requests.HTTPError as e:
            log.error("Error HTTP página %d: %s", page, e)
            break

        items = data.get("content", [])
        if total_pages is None:
            total_pages = data.get("totalPages", 0)
            log.info("Total páginas: %d | Total registros: %d",
                     total_pages, data.get("totalElements", 0))

        if not items:
            break

        rows = [transform(r) for r in items]
        # Upsert en lotes de 100
        for i in range(0, len(rows), 100):
            batch = rows[i:i+100]
            try:
                sb.table("subvenciones").upsert(batch, on_conflict="id").execute()
            except Exception as e:
                log.error("Error upsert lote página %d: %s", page, e)

        total_inserted += len(rows)
        log.info("Página %d/%d — %d registros (total: %d)",
                 page + 1, total_pages, len(rows), total_inserted)

        if data.get("last", True):
            break

        page += 1
        time.sleep(RATE_LIMIT_SLEEP)

    log.info("Ingesta BDNS finalizada. Total insertados/actualizados: %d", total_inserted)

# ---------------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingestor BDNS → Supabase")
    parser.add_argument("--days",  type=int, default=7,
                        help="Últimos N días (default: 7). Ignorado si se usan --desde/--hasta.")
    parser.add_argument("--desde", type=str, default=None,
                        help="Fecha inicio dd/mm/yyyy")
    parser.add_argument("--hasta", type=str, default=None,
                        help="Fecha fin dd/mm/yyyy (default: hoy)")
    args = parser.parse_args()

    if args.desde:
        fecha_desde = args.desde
        fecha_hasta = args.hasta or date.today().strftime("%d/%m/%Y")
    else:
        hoy = date.today()
        fecha_desde = (hoy - timedelta(days=args.days)).strftime("%d/%m/%Y")
        fecha_hasta = hoy.strftime("%d/%m/%Y")

    ingest(fecha_desde, fecha_hasta)
