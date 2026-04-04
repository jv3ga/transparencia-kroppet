-- ============================================================
-- Transparencia by Kroppet — CockroachDB Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS organos (
  id      SERIAL PRIMARY KEY,
  codigo  TEXT NOT NULL,
  nombre  TEXT NOT NULL,
  tipo    TEXT,
  UNIQUE (codigo)
);

CREATE TABLE IF NOT EXISTS empresas (
  id         SERIAL PRIMARY KEY,
  nif        TEXT NOT NULL,
  nombre     TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (nif)
);

CREATE TABLE IF NOT EXISTS contratos (
  id                 SERIAL PRIMARY KEY,
  expediente         TEXT,
  objeto             TEXT NOT NULL,
  tipo_contrato      TEXT,
  procedimiento      TEXT,
  importe_sin_iva    NUMERIC,
  importe_con_iva    NUMERIC,
  empresa_id         INT REFERENCES empresas(id),
  organo_id          INT REFERENCES organos(id),
  fecha_adjudicacion DATE,
  fecha_publicacion  DATE,
  estado             TEXT,
  url_fuente         TEXT,
  raw_data           JSONB,
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- Índices para filtros y ordenación frecuentes
CREATE INDEX IF NOT EXISTS idx_contratos_empresa_id       ON contratos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_contratos_organo_id        ON contratos (organo_id);
CREATE INDEX IF NOT EXISTS idx_contratos_fecha_pub        ON contratos (fecha_publicacion DESC);
CREATE INDEX IF NOT EXISTS idx_contratos_importe          ON contratos (importe_sin_iva DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_contratos_estado           ON contratos (estado);
CREATE INDEX IF NOT EXISTS idx_contratos_tipo             ON contratos (tipo_contrato);
CREATE INDEX IF NOT EXISTS idx_contratos_objeto           ON contratos USING gin (to_tsvector('spanish', objeto));

-- Vistas de ranking
CREATE VIEW empresa_ranking AS
SELECT
  e.id,
  e.nombre,
  e.nif,
  COUNT(c.id)::int            AS num_contratos,
  SUM(c.importe_sin_iva)      AS total_importe
FROM empresas e
JOIN contratos c ON c.empresa_id = e.id
WHERE c.importe_sin_iva IS NOT NULL
GROUP BY e.id, e.nombre, e.nif;

CREATE VIEW organo_ranking AS
SELECT
  o.id,
  o.nombre,
  o.codigo,
  COUNT(c.id)::int            AS num_contratos,
  SUM(c.importe_sin_iva)      AS total_importe
FROM organos o
JOIN contratos c ON c.organo_id = o.id
WHERE c.importe_sin_iva IS NOT NULL
GROUP BY o.id, o.nombre, o.codigo;

-- Vista para gráficas del landing
CREATE VIEW contratos_por_tipo AS
SELECT
  tipo_contrato,
  COUNT(*)::int          AS num_contratos,
  SUM(importe_sin_iva)   AS total_importe
FROM contratos
WHERE tipo_contrato IS NOT NULL
  AND tipo_contrato NOT IN ('22', '32')
GROUP BY tipo_contrato
ORDER BY total_importe DESC NULLS LAST;
