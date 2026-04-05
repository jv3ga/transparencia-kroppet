import Link from "next/link";
import pool from "@/lib/cockroach";
import { StatsSection } from "@/components/stats-section";
import { ChartsSection } from "@/components/charts-section";
import { fmtCompact } from "@/lib/constants";

async function getTopRedes() {
  const { rows } = await pool.query(
    `SELECT administrador, num_empresas, total_contratos, total_importe
     FROM administrador_redes
     ORDER BY num_empresas DESC, total_importe DESC
     LIMIT 3`
  );
  return rows;
}

function toTitleCase(s: string) {
  return s.toLowerCase().split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default async function HomePage() {
  const topRedes = await getTopRedes();

  return (
    <main className="max-w-4xl mx-auto px-5 py-12 space-y-16">

      {/* Hero */}
      <section className="space-y-5">
        <p className="text-xs font-semibold tracking-widest uppercase text-primary"
           style={{ fontFamily: "var(--font-display)" }}>
          Datos del gobierno · Análisis nuestro
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight"
            style={{ fontFamily: "var(--font-display)" }}>
          El gasto público español,<br />
          <span className="text-primary">al descubierto</span>
        </h1>
        <p className="text-muted-foreground max-w-xl leading-relaxed">
          Transparencia by Kroppet agrega y cruza datos oficiales para que cualquier
          ciudadano pueda entender quién se lleva los contratos públicos, cuánto cobran
          los políticos y cómo se gastan tus impuestos.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href="/contratos"
            className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-colors hover:bg-primary/80"
          >
            Ver contratos públicos →
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section>
        <SectionHeader label="En nuestra base de datos" />
        <StatsSection />
      </section>

      {/* Gráficas */}
      <section>
        <SectionHeader label="Radiografía del gasto" />
        <ChartsSection />
      </section>

      {/* Redes empresariales highlight */}
      {topRedes.length > 0 && (
        <section>
          <SectionHeader label="Redes empresariales" />
          <p className="text-xs text-muted-foreground mb-4 -mt-2">
            Administradores que controlan varias empresas adjudicatarias de contratos públicos.
          </p>
          <div className="space-y-2 mb-4">
            {topRedes.map((r: { administrador: string; num_empresas: number; total_contratos: number; total_importe: number }) => (
              <Link
                key={r.administrador}
                href={`/redes?admin=${encodeURIComponent(r.administrador)}`}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-accent/30 transition-colors"
              >
                <span
                  className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    r.num_empresas >= 4
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}
                >
                  {r.num_empresas}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{toTitleCase(r.administrador)}</p>
                  <p className="text-xs text-muted-foreground tabnum" style={{ fontFamily: "var(--font-mono)" }}>
                    {r.total_contratos} contratos · {fmtCompact(r.total_importe)}
                  </p>
                </div>
                <span className="text-xs text-primary shrink-0 whitespace-nowrap">Ver red →</span>
              </Link>
            ))}
          </div>
          <Link href="/redes" className="text-xs text-primary hover:underline underline-offset-2">
            Ver todos los administradores en red →
          </Link>
        </section>
      )}

      {/* Módulos */}
      <section>
        <SectionHeader label="Qué puedes consultar" />
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              title: "Contratos públicos",
              desc: "Adjudicaciones del sector público. Filtra por ministerio, empresa, importe y procedimiento.",
              href: "/contratos",
              live: true,
            },
            {
              title: "Subvenciones",
              desc: "Qué entidades —empresas, ONGs, partidos— reciben subvenciones públicas y de qué ministerios.",
              href: "/subvenciones",
              live: true,
            },
            {
              title: "Sueldos de altos cargos",
              desc: "Retribuciones, dietas y complementos de los cargos públicos del gobierno central.",
              href: "/altos-cargos",
              live: true,
            },
            {
              title: "Redes empresariales",
              desc: "Administradores que controlan varias empresas adjudicatarias. Detecta concentración de contratos.",
              href: "/redes",
              live: true,
            },
            {
              title: "Presupuesto del Estado",
              desc: "Ejecución presupuestaria real vs. presupuestado, por ministerio y programa.",
              href: "/presupuesto",
              live: false,
            },
          ].map((m) => m.live ? (
              <Link key={m.title} href={m.href}
                    className="bg-card border border-border rounded-xl p-5 flex flex-col gap-2 hover:border-primary/50 hover:bg-accent/30 transition-colors">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                    {m.title}
                  </h3>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
                    Live
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
                <span className="text-xs text-primary mt-auto pt-1">Explorar →</span>
              </Link>
            ) : (
              <div key={m.title}
                   className="bg-card border border-border rounded-xl p-5 flex flex-col gap-2 opacity-60">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                    {m.title}
                  </h3>
                  <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Pronto
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
              </div>
            ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between gap-3 text-xs text-muted-foreground">
        <p>
          Datos bajo{" "}
          <a href="https://www.boe.es/buscar/act.php?id=BOE-A-2007-19814" target="_blank" rel="noopener noreferrer"
             className="underline underline-offset-2 hover:text-foreground">
            Ley 37/2007
          </a>{" "}
          · Fuente: Plataforma de Contratación del Estado
        </p>
        <p>© {new Date().getFullYear()} Kroppet · Proyecto independiente</p>
      </footer>

    </main>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground whitespace-nowrap"
          style={{ fontFamily: "var(--font-display)" }}>
        {label}
      </h2>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
