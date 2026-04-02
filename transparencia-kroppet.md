# Transparencia by Kroppet
**Portal independiente de rendición de cuentas del sector público español**

> Datos del gobierno. Análisis nuestro.

---

## 1. Visión del Proyecto

**Transparencia by Kroppet** es un portal web independiente que agrega, procesa y visualiza datos públicos del gobierno español para que cualquier ciudadano pueda entender, sin conocimientos técnicos, cómo se gasta el dinero público, quién lo recibe, cuánto cobran los políticos y qué empresas se benefician de contratos públicos.

La información proviene de fuentes oficiales y públicas. El análisis, las visualizaciones y las alertas son independientes, críticos y elaborados por Kroppet.

---

## 2. Problema que Resuelve

Los datos públicos en España existen pero están:
- Dispersos en docenas de portales distintos (transparencia.gob.es, datos.gob.es, BOE, BORME, BDNS...)
- En formatos poco accesibles (PDFs, XML sin procesar, tablas sin contexto)
- Sin cruce entre fuentes (¿quién está detrás de la empresa que recibió el contrato?)
- Sin análisis crítico ni detección de anomalías
- Sin interfaz pensada para el ciudadano medio

**Transparencia by Kroppet** resuelve todo esto en un solo lugar.

---

## 3. Funcionalidades Core (MVP)

### 3.1 Contratos Públicos
- Búsqueda y filtrado de contratos adjudicados por ministerio, empresa, importe y año
- Ranking de empresas que más contratos reciben
- Detección de contratos fraccionados (para eludir licitación)
- Visualización del reparto por tipo de procedimiento (abierto, negociado, emergencia)
- Fuente: Plataforma de Contratación del Sector Público (API + XML)

### 3.2 Sueldos y Retribuciones
- Salarios de altos cargos del gobierno central
- Comparativas históricas y entre cargos
- Dietas, complementos y retribuciones variables
- Fuente: Portal de Transparencia del Estado (transparencia.gob.es)

### 3.3 Subvenciones
- Qué entidades (empresas, ONGs, partidos...) reciben subvenciones públicas
- Importes, ministerios que las conceden y evolución temporal
- Fuente: Base de Datos Nacional de Subvenciones (BDNS)

### 3.4 Presupuesto del Estado
- Visualización del presupuesto por ministerio, programa y partida
- Ejecución presupuestaria real vs. presupuestado
- Evolución interanual
- Fuente: datos.gob.es, Ministerio de Hacienda

### 3.5 Perfil de Empresas
- Cruce entre empresa → contratos recibidos → quién está detrás (administradores, propietarios)
- Fuente: BORME + Plataforma de Contratación

---

## 4. Funcionalidades Avanzadas (Post-MVP)

- **Alertas** — el usuario se suscribe a una empresa o ministerio y recibe notificaciones cuando se adjudican nuevos contratos
- **Detección de anomalías con IA** — contratos a una misma empresa que acumulan cerca del límite legal, procedimientos de emergencia injustificados, variaciones de precio sospechosas
- **Mapa de influencia** — relaciones entre empresas, partidos, cargos públicos y contratos
- **Comparativa autonómica** — datos de comunidades autónomas y grandes ayuntamientos
- **API pública** — para que periodistas, investigadores y otras apps reutilicen los datos procesados
- **Solicitudes de acceso** — ayudar al ciudadano a enviar solicitudes de información al amparo de la Ley 19/2013

---

## 5. Fuentes de Datos

| Fuente | Contenido | Acceso |
|--------|-----------|--------|
| Plataforma de Contratación del Estado | Contratos desde 2014 | API REST + XML |
| transparencia.gob.es | Altos cargos, salarios, agendas | Scraping / descarga |
| BDNS (Hacienda) | Subvenciones concedidas | API REST |
| datos.gob.es | Dataset general sector público | API CKAN |
| BOE (api.boe.es) | Adjudicaciones, nombramientos | API XML oficial |
| BORME | Empresas y administradores | XML descargable |
| INE | Datos socioeconómicos de contexto | API REST |

Todas las fuentes son **públicas, gratuitas y reutilizables** bajo la legislación española de datos abiertos.

---

## 6. Stack Técnico Propuesto

### Frontend
- **Next.js** (App Router) — SSR para SEO, rutas dinámicas, rendimiento
- **Tailwind CSS** — estilos
- **shadcn/ui** — componentes base
- **Recharts / D3.js** — visualizaciones y gráficos
- **React Query / SWR** — fetching y caché de datos

### Backend / API
- **Node.js con Fastify** o **Python con FastAPI** — elección según preferencia del equipo
- **PostgreSQL** — base de datos principal (contratos, subvenciones, empresas)
- **Redis** — caché de consultas frecuentes
- **Cron jobs** — ingesta periódica de datos desde fuentes oficiales

### Infraestructura
- **Vercel** (frontend) + **Railway / Fly.io** (backend y DB) — arranque low-cost
- **Docker** — contenedores para los scrapers e ingestores
- O bien: **Supabase** como backend completo para MVP rápido

### Ingesta de Datos (ETL)
- Scripts Python para cada fuente (requests + lxml para XML del BOE/BORME)
- Scheduler: **Celery + Beat** o **GitHub Actions** con cron
- Normalización y almacenamiento en DB propia para no depender de las APIs externas

---

## 7. Arquitectura General

```
[Fuentes Oficiales]
BOE / BORME / BDNS / Plataforma Contratación / datos.gob.es
        |
        v
[ETL / Ingestores] (Python scripts, cron diario/semanal)
        |
        v
[Base de Datos Propia] (PostgreSQL)
Contratos | Empresas | Subvenciones | Altos Cargos | Presupuesto
        |
        v
[API Backend] (FastAPI / Fastify)
        |
        v
[Frontend Next.js]
Búsqueda | Rankings | Visualizaciones | Alertas | Perfiles
        |
        v
[Usuario Final] — ciudadanos, periodistas, investigadores
```

---

## 8. Modelo de Independencia Editorial

Dado que los datos son del gobierno, la independencia reside en:

1. **Metodología pública** — documentar cómo se procesan y cruzan los datos
2. **Sin financiación pública** — el proyecto no recibe dinero de administraciones
3. **Código abierto** — el código de ingesta y análisis es público (GitHub)
4. **Análisis propio** — los rankings, alertas y detecciones de anomalías son criterio de Kroppet, no del gobierno
5. **Registro de cambios** — se guarda histórico para detectar si el gobierno modifica datos retroactivamente

---

## 9. Modelo de Negocio (Opciones)

| Modelo | Descripción |
|--------|-------------|
| **Freemium** | Consulta básica gratuita, alertas y API para empresas/medios de pago |
| **SaaS B2B** | Suscripción para medios de comunicación, consultoras y despachos de abogados |
| **Donaciones** | Modelo Civio — ciudadanos que apoyan el proyecto |
| **Datos como servicio** | API con acceso normalizado y documentado para desarrolladores |

El MVP puede arrancar gratuito para validar audiencia antes de monetizar.

---

## 10. Referentes y Competencia

| Proyecto | País | Fortaleza | Diferencial de Kroppet |
|----------|------|-----------|------------------------|
| Civio | España | Periodismo de datos | Kroppet es más plataforma, menos medio |
| OpenSpending | Internacional | Presupuestos globales | Kroppet es más profundo en España |
| Who Targets Me | UK | Ads políticos | Diferente área |
| ProPublica (FOIA) | EEUU | Solicitudes info | Referente de modelo |
| Monitoria (Brasil) | Brasil | Congreso | Referente de diseño |

---

## 11. Roadmap Propuesto

### Fase 1 — MVP (2-3 meses)
- [ ] ETL básico: Plataforma de Contratación + BDNS
- [ ] Base de datos normalizada (contratos + subvenciones)
- [ ] Frontend: búsqueda, filtros, tabla de resultados
- [ ] Landing page con misión del proyecto
- [ ] Despliegue público

### Fase 2 — Enriquecimiento (3-6 meses)
- [ ] Añadir fuentes: BOE, BORME, transparencia.gob.es
- [ ] Perfiles de empresa con cruce de datos
- [ ] Visualizaciones avanzadas (mapas de calor, series temporales)
- [ ] Sistema de alertas por email

### Fase 3 — Escalado (6-12 meses)
- [ ] Detección de anomalías con IA/ML
- [ ] Datos autonómicos
- [ ] API pública documentada
- [ ] Modelo de negocio activado

---

## 12. Consideraciones Legales

- Los datos del sector público son reutilizables bajo la **Ley 37/2007** y la **Directiva EU 2019/1024**
- La reutilización requiere **atribuir la fuente** pero no pide permiso previo
- No se publican datos personales de ciudadanos (solo de cargos públicos en ejercicio de su función)
- El análisis y las conclusiones son **opinión e información** protegidas por la libertad de expresión
- Consultar con abogado especializado antes del lanzamiento público

---

## 13. Nombre y Marca

**"Transparencia by Kroppet"**

- Claro y descriptivo — el usuario sabe qué es sin explicación
- "by Kroppet" — da autoría, responsabilidad y construye marca de empresa
- Posible dominio: `transparencia.kroppet.es` o `transparenciaespana.es`
- Tono de marca: riguroso, accesible, independiente, sin sensacionalismo

---

*Documento generado para desarrollo con Claude Code*
*Proyecto: Transparencia by Kroppet — Kroppet, 2026*
