import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const revalidate = 3600;

async function getStats() {
  const { data } = await supabase.rpc("get_stats").single<{
    total_contratos: number;
    empresas_distintas: number;
    organos_distintos: number;
    volumen_total: number;
  }>();
  return (
    data ?? {
      total_contratos: 566,
      empresas_distintas: 217,
      organos_distintos: 271,
      volumen_total: 471806660,
    }
  );
}

function formatMillones(n: number) {
  if (n >= 1_000_000_000)
    return `${(n / 1_000_000_000).toFixed(1).replace(".", ",")} B€`;
  return `${(n / 1_000_000).toFixed(1).replace(".", ",")} M€`;
}

export default async function HomePage() {
  const stats = await getStats();

  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-b from-background to-muted/30 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">
            Datos del gobierno. Análisis nuestro.
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            El gasto público español,
            <br />
            <span className="text-primary">al descubierto</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Transparencia by Kroppet agrega y cruza datos oficiales para que
            cualquier ciudadano pueda entender quién se lleva los contratos
            públicos, cuánto cobran los políticos y cómo se gastan tus
            impuestos.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/contratos"
              className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-5 h-9 text-sm font-medium transition-colors hover:bg-primary/80"
            >
              Ver contratos públicos
            </Link>
            <a
              href="https://github.com/kroppet/transparencia-kroppet"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-5 h-9 text-sm font-medium transition-colors hover:bg-muted"
            >
              Código abierto
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-center">
          {[
            {
              value: stats.total_contratos.toLocaleString("es-ES"),
              label: "Contratos indexados",
            },
            {
              value: stats.empresas_distintas.toLocaleString("es-ES"),
              label: "Empresas adjudicatarias",
            },
            {
              value: formatMillones(stats.volumen_total),
              label: "Volumen total adjudicado",
            },
          ].map((s) => (
            <div key={s.label} className="p-6 rounded-xl border border-border bg-card">
              <p className="text-3xl font-bold tabular-nums">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Módulos */}
      <section className="border-t border-border bg-muted/20">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h2 className="text-xl font-semibold mb-8">Qué puedes consultar</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                title: "Contratos públicos",
                description:
                  "Adjudicaciones del sector público desde 2024. Filtra por ministerio, empresa, importe y procedimiento.",
                href: "/contratos",
                available: true,
              },
              {
                title: "Subvenciones",
                description:
                  "Qué entidades —empresas, ONGs, partidos— reciben subvenciones públicas y de qué ministerios.",
                href: "/subvenciones",
                available: false,
              },
              {
                title: "Sueldos de altos cargos",
                description:
                  "Retribuciones, dietas y complementos de los cargos públicos del gobierno central.",
                href: "/altos-cargos",
                available: false,
              },
              {
                title: "Presupuesto del Estado",
                description:
                  "Ejecución presupuestaria real vs. presupuestado, por ministerio y programa.",
                href: "/presupuesto",
                available: false,
              },
            ].map((m) => (
              <div
                key={m.title}
                className="p-5 rounded-xl border border-border bg-card flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{m.title}</h3>
                  {m.available ? (
                    <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                      Disponible
                    </span>
                  ) : (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      Próximamente
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{m.description}</p>
                {m.available && (
                  <Link
                    href={m.href}
                    className="text-sm text-primary hover:underline mt-auto pt-2 w-fit"
                  >
                    Explorar →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>
            Datos bajo{" "}
            <a
              href="https://datos.gob.es/es/licencias"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Ley 37/2007
            </a>{" "}
            · Fuente: Plataforma de Contratación del Estado
          </p>
          <p>© {new Date().getFullYear()} Kroppet · Proyecto independiente</p>
        </div>
      </footer>
    </main>
  );
}
