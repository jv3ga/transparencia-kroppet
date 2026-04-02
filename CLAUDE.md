# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

**Transparencia by Kroppet** es un portal web independiente que agrega, procesa y visualiza datos públicos del gobierno español (contratos, sueldos de altos cargos, subvenciones, presupuesto). El spec completo está en `transparencia-kroppet.md`.

## Stack Técnico

### Frontend
- **Next.js** (App Router) con SSR
- **Tailwind CSS** + **shadcn/ui**
- **Recharts / D3.js** para visualizaciones
- **React Query / SWR** para fetching y caché

### Backend / API
- **FastAPI** (Python) o **Fastify** (Node.js) — por decidir
- **PostgreSQL** como base de datos principal
- **Redis** para caché de consultas frecuentes

### ETL / Ingesta
- Scripts Python por fuente (requests + lxml para XML)
- Scheduler: Celery + Beat o GitHub Actions con cron
- Normalización a esquema propio para desacoplar de APIs externas

### Infraestructura
- Frontend: Vercel
- Backend + DB: Railway / Fly.io (o Supabase para MVP rápido)
- Docker para scrapers e ingestores

## Arquitectura General

```
[Fuentes Oficiales] → [ETL Python (cron)] → [PostgreSQL]
                                                  ↓
                                          [API Backend]
                                                  ↓
                                        [Frontend Next.js]
```

Las cinco entidades de datos principales son: **Contratos, Empresas, Subvenciones, Altos Cargos, Presupuesto**.

## Fuentes de Datos Oficiales

| Fuente | Contenido | Acceso |
|--------|-----------|--------|
| Plataforma de Contratación del Estado | Contratos desde 2014 | API REST + XML |
| transparencia.gob.es | Altos cargos, salarios | Scraping / descarga |
| BDNS (Hacienda) | Subvenciones | API REST |
| datos.gob.es | Datasets sector público | API CKAN |
| BOE (api.boe.es) | Adjudicaciones, nombramientos | API XML |
| BORME | Empresas y administradores | XML descargable |

## Roadmap

- **Fase 1 (MVP):** ETL Plataforma Contratación + BDNS → DB → frontend con búsqueda/filtros
- **Fase 2:** Añadir BOE, BORME, transparencia.gob.es; perfiles de empresa; alertas email
- **Fase 3:** Detección de anomalías con IA, datos autonómicos, API pública

## Consideraciones Clave

- Solo se publican datos de **cargos públicos en ejercicio de su función**, nunca datos personales de ciudadanos.
- Los datos son reutilizables bajo Ley 37/2007 y Directiva EU 2019/1024 — requieren atribución de fuente.
- El proyecto no recibe financiación pública (independencia editorial).
- Se debe guardar histórico de datos para detectar modificaciones retroactivas del gobierno.
