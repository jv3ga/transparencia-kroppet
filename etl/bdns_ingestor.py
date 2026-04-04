"""
ETL — Base de Datos Nacional de Subvenciones (BDNS)
Fuente: https://www.infosubvenciones.es/bdnstrans/api
Destino: CockroachDB (tabla subvenciones)

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
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

BASE_URL = "https://www.infosubvenciones.es/bdnstrans/api/concesiones/busqueda"
PAGE_SIZE = 500
RATE_LIMIT_SLEEP = 0.3  # segundos entre peticiones (máx 5 req/s)
BATCH_SIZE = 200

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


# ---------------------------------------------------------------------------
# Fetch
# ---------------------------------------------------------------------------
def fetch_page(fecha_desde: str, fecha_hasta: str, page: int, retries: int = 4) -> dict:
    """Fetcha una página de concesiones BDNS. Fechas en formato dd/mm/yyyy."""
    for attempt in range(retries):
        try:
            resp = requests.get(BASE_URL, params={
                "page":       page,
                "pageSize":   PAGE_SIZE,
                "fechaDesde": fecha_desde,
                "fechaHasta": fecha_hasta,
            }, timeout=90, headers={"Accept": "application/json"})
            resp.raise_for_status()
            return resp.json()
        except requests.ReadTimeout:
            if attempt == retries - 1:
                raise
            wait = 10 * (attempt + 1)
            log.warning("Timeout en página %d, reintentando en %ds (intento %d/%d)...",
                        page, wait, attempt + 1, retries)
            time.sleep(wait)


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
        "id":                raw.get("id"),
        "cod_concesion":     raw.get("codConcesion"),
        "fecha_concesion":   _date(raw.get("fechaConcesion")),
        "beneficiario":      raw.get("beneficiario"),
        "instrumento":       raw.get("instrumento"),
        "importe":           raw.get("importe"),
        "ayuda_equivalente": raw.get("ayudaEquivalente"),
        "convocatoria":      raw.get("convocatoria"),
        "id_convocatoria":   str(raw["idConvocatoria"]) if raw.get("idConvocatoria") else None,
        "num_convocatoria":  raw.get("numeroConvocatoria"),
        "nivel1":            raw.get("nivel1"),
        "nivel2":            raw.get("nivel2"),
        "nivel3":            raw.get("nivel3"),
        "url_br":            raw.get("urlBR"),
        "tiene_proyecto":    raw.get("tieneProyecto"),
        "fecha_alta":        _date(raw.get("fechaAlta")),
    }


# ---------------------------------------------------------------------------
# Upsert batch
# ---------------------------------------------------------------------------
COLS = [
    "id", "cod_concesion", "fecha_concesion", "beneficiario", "instrumento",
    "importe", "ayuda_equivalente", "convocatoria", "id_convocatoria",
    "num_convocatoria", "nivel1", "nivel2", "nivel3", "url_br",
    "tiene_proyecto", "fecha_alta",
]
UPDATES = ", ".join(f"{c} = EXCLUDED.{c}" for c in COLS if c != "id")

def upsert_batch(cur, rows: list[dict]) -> None:
    if not rows:
        return
    values = [[r.get(c) for c in COLS] for r in rows]
    psycopg2.extras.execute_values(
        cur,
        f"""
        INSERT INTO subvenciones ({", ".join(COLS)})
        VALUES %s
        ON CONFLICT (id) DO UPDATE SET {UPDATES}
        """,
        values,
        page_size=200,
    )


# ---------------------------------------------------------------------------
# Ingest
# ---------------------------------------------------------------------------
def ingest(fecha_desde: str, fecha_hasta: str) -> None:
    """
    Ingesta concesiones BDNS entre dos fechas (formato dd/mm/yyyy).
    Usa upsert por id para ser idempotente.
    """
    conn = get_conn()
    cur = conn.cursor()
    log.info("Ingesta BDNS del %s al %s", fecha_desde, fecha_hasta)

    page = 0
    total_pages = None
    total_inserted = 0
    batch: list[dict] = []

    try:
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

            batch.extend(transform(r) for r in items)
            total_inserted += len(items)

            if len(batch) >= BATCH_SIZE:
                upsert_batch(cur, batch)
                conn.commit()
                batch = []
                log.info("Commit — página %d/%d | total: %d", page + 1, total_pages or "?", total_inserted)

            log.info("Página %d/%d — %d registros (total: %d)",
                     page + 1, total_pages or "?", len(items), total_inserted)

            if data.get("last", True):
                break

            page += 1
            time.sleep(RATE_LIMIT_SLEEP)

        # flush final
        if batch:
            upsert_batch(cur, batch)
            conn.commit()

        log.info("Ingesta BDNS finalizada. Total insertados/actualizados: %d", total_inserted)

    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()


def ingest_range(fecha_desde_str: str, fecha_hasta_str: str) -> None:
    """
    Divide el rango en chunks mensuales y llama a ingest() por cada uno.
    El API de BDNS devuelve 0 resultados para rangos > ~31 días.
    """
    fmt = "%d/%m/%Y"
    start = datetime.strptime(fecha_desde_str, fmt).date()
    end   = datetime.strptime(fecha_hasta_str, fmt).date()

    cursor = start
    while cursor <= end:
        if cursor.month == 12:
            month_end = date(cursor.year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(cursor.year, cursor.month + 1, 1) - timedelta(days=1)
        chunk_end = min(month_end, end)

        log.info("=== Chunk: %s → %s ===", cursor.strftime(fmt), chunk_end.strftime(fmt))
        ingest(cursor.strftime(fmt), chunk_end.strftime(fmt))

        cursor = chunk_end + timedelta(days=1)


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingestor BDNS → CockroachDB")
    parser.add_argument("--days",  type=int, default=7,
                        help="Últimos N días (default: 7). Ignorado si se usan --desde/--hasta.")
    parser.add_argument("--desde", type=str, default=None,
                        help="Fecha inicio dd/mm/yyyy")
    parser.add_argument("--hasta", type=str, default=None,
                        help="Fecha fin dd/mm/yyyy (default: hoy)")
    args = parser.parse_args()

    fmt = "%d/%m/%Y"
    if args.desde:
        fecha_desde = args.desde
        fecha_hasta = args.hasta or date.today().strftime(fmt)
    else:
        hoy = date.today()
        fecha_desde = (hoy - timedelta(days=args.days)).strftime(fmt)
        fecha_hasta = hoy.strftime(fmt)

    start = datetime.strptime(fecha_desde, fmt).date()
    end   = datetime.strptime(fecha_hasta, fmt).date()
    if (end - start).days > 31:
        ingest_range(fecha_desde, fecha_hasta)
    else:
        ingest(fecha_desde, fecha_hasta)
