import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const revalidate = 3600;

async function getStats() {
  const { data } = await supabase
    .from("contratos")
    .select("importe_sin_iva, empresa_id, organo_id");

  if (!data) return { total: 0, empresas: 0, organos: 0, volumen: 0 };

  const empresas = new Set(data.map((r) => r.empresa_id).filter(Boolean)).size;
  const organos  = new Set(data.map((r) => r.organo_id).filter(Boolean)).size;
  const volumen  = data.reduce((s, r) => s + (r.importe_sin_iva ?? 0), 0);
  return { total: data.length, empresas, organos, volumen };
}

function fmtNum(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(".", ",")} B€`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1).replace(".", ",")} M€`;
  return n.toLocaleString("es-ES");
}

export default async function HomePage() {
  const stats = await getStats();

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
        <SectionHeader label="En la base de datos" />
        <div className="flex flex-wrap gap-3">
          {[
            { v: fmtNum(stats.total),    label: "contratos indexados" },
            { v: fmtNum(stats.empresas), label: "empresas adjudicatarias" },
            { v: fmtNum(stats.organos),  label: "órganos contratantes" },
            { v: fmtNum(stats.volumen),  label: "volumen adjudicado" },
          ].map(({ v, label }) => (
            <div key={label}
                 className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg">
              <span className="text-primary font-bold text-sm tabnum"
                    style={{ fontFamily: "var(--font-mono)" }}>
                {v}
              </span>
              <span className="text-muted-foreground text-xs">{label}</span>
            </div>
          ))}
        </div>
      </section>

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
              live: false,
            },
            {
              title: "Sueldos de altos cargos",
              desc: "Retribuciones, dietas y complementos de los cargos públicos del gobierno central.",
              href: "/altos-cargos",
              live: false,
            },
            {
              title: "Presupuesto del Estado",
              desc: "Ejecución presupuestaria real vs. presupuestado, por ministerio y programa.",
              href: "/presupuesto",
              live: false,
            },
          ].map((m) => (
            <div key={m.title}
                 className="bg-card border border-border rounded-xl p-5 flex flex-col gap-2 hover:border-muted-foreground/30 transition-colors">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                  {m.title}
                </h3>
                {m.live ? (
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
                    Live
                  </span>
                ) : (
                  <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Pronto
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
              {m.live && (
                <Link href={m.href}
                      className="text-xs text-primary hover:underline underline-offset-2 mt-auto pt-1 w-fit">
                  Explorar →
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between gap-3 text-xs text-muted-foreground">
        <p>
          Datos bajo{" "}
          <a href="https://datos.gob.es/es/licencias" target="_blank" rel="noopener noreferrer"
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
