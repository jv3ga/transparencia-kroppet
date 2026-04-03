# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

**Transparencia by Kroppet** es un portal web independiente que agrega, procesa y visualiza datos públicos del gobierno español (contratos, sueldos de altos cargos, subvenciones, presupuesto). El spec completo está en `transparencia-kroppet.md`.

## Stack Técnico

### Frontend
- **Next.js 16** (App Router) con SSR
- **Tailwind CSS** + **shadcn/ui v4** (usa @base-ui/react, NO Radix — sin `asChild`)
- **Recharts / D3.js** para visualizaciones
- Fuentes: `--font-display` (Unbounded), `--font-mono` (Space_Mono), Inter (body)
- Tema: zinc-950 + amber-400 dark / zinc-50 + amber-600 light

### Backend / API
- Supabase (PostgreSQL + PostgREST + RLS)
- Edge runtime API routes en Next.js (`export const runtime = "edge"`)

### ETL / Ingesta
- Scripts Python con virtualenv — **siempre activar con `workon <proyecto>`**
- `etl/place_ingestor.py` — feed Atom PLACE con namespaces DGPE
- Scheduler: GitHub Actions cron (`.github/workflows/etl-contratos.yml`)

### Infraestructura
- Frontend: Vercel (desplegado desde `frontend/`)
- DB: Supabase proyecto `jyvkbxeygtvrnndfralq`

## Arquitectura General

```
[Fuentes Oficiales] → [ETL Python (cron)] → [PostgreSQL/Supabase]
                                                  ↓
                                     [Edge API routes Next.js]
                                                  ↓
                                        [Frontend Next.js SSR]
```

Las cinco entidades de datos principales son: **Contratos, Empresas, Subvenciones, Altos Cargos, Presupuesto**.

## Patrón de páginas con listado + scroll infinito

Todas las páginas de listado siguen este patrón. Al crear una nueva, seguir todos estos pasos:

### 1. SSR page (`page.tsx`)
- `export const dynamic = "force-dynamic"`
- Leer **todos** los filtros posibles de `searchParams` (incluidos los que vienen de otras páginas por URL, como `organo_id`, `empresa_id`)
- Aplicar esos filtros en la query inicial del servidor
- Pasar los valores como props `initial*` al componente cliente

```tsx
// ✅ Correcto
const { q, estado, empresa_id, organo_id } = await searchParams;
const initialData = await getFirstPage(q, estado, empresa_id, organo_id);
// ...
<TablaCliente initialEmpresaId={empresa_id ?? ""} initialOrganoId={organo_id ?? ""} ... />
```

### 2. Componente cliente (`*-table.tsx`)
- Filtros "fijos" que vienen de URL externa (ej: `empresa_id` al llegar desde `/empresas`) → guardar en `useRef`, **no en state**, y añadirlos siempre a cada llamada a `fetchPage`
- Filtros interactivos del usuario → en state `filters`
- Deduplicar rows por `id` en cada fetch

```tsx
// Filtros fijos desde URL — se aplican silenciosamente en cada fetch
const fixedEmpresaId = useRef(initialEmpresaId);
const fixedOrganoId  = useRef(initialOrganoId);

// En fetchPage:
if (fixedEmpresaId.current) params.set("empresa_id", fixedEmpresaId.current);
if (fixedOrganoId.current)  params.set("organo_id",  fixedOrganoId.current);
```

### 3. API route (`/api/*/route.ts`)
- Leer **todos** los params posibles del `searchParams`
- Orden estable: `.order("campo_principal", { ascending: false }).order("id", { ascending: false })`

### 4. Rankings (empresas, órganos)
- Usar vistas PostgreSQL (`empresa_ranking`, `organo_ranking`) con COUNT + SUM agrupados
- El link de cada fila apunta a `/contratos?empresa_id=X` o `/contratos?organo_id=X`

## Deploy en Vercel

**NUNCA hacer deploy automáticamente.** El deploy a Vercel solo se ejecuta cuando el usuario lo pide explícitamente, o cuando yo considero que es buen momento, en cuyo caso debo preguntar antes de hacerlo. El comando es `vercel --prod` desde `frontend/`.

## Supabase — Consideraciones

- **Límite por defecto de PostgREST**: 1000 filas. Para contadores usar `{ count: "exact", head: true }` — nunca `data.length`
- **Agregados**: usar vistas SQL o RPC, no intentar hacer SUM/COUNT en supabase-js
- **Paginación**: `.range(cursor, cursor + PAGE_SIZE - 1)` con orden estable
- **RLS**: las tablas públicas tienen política `lectura_publica` (SELECT USING true). El ETL usa `service_role` que bypasea RLS
- **Keys**: usar `sb_publishable_...` (anon) y `sb_secret_...` (service_role) — las legacy JWT están activas pero se migrarán

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
