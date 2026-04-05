import pool from "@/lib/cockroach";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import RedesTable from "./redes-table";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

async function getStats() {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS total, SUM(num_empresas) AS empresas, SUM(total_contratos) AS contratos
     FROM administrador_redes`
  );
  return rows[0];
}

async function getFirstPage(): Promise<Row[]> {
  const { rows } = await pool.query(
    `SELECT administrador, num_empresas, total_contratos, total_importe, empresas
     FROM administrador_redes
     ORDER BY num_empresas DESC, total_importe DESC NULLS LAST
     LIMIT $1`,
    [PAGE_SIZE]
  );
  return rows as Row[];
}

export default async function RedesPage({
  searchParams,
}: {
  searchParams: Promise<{ admin?: string }>;
}) {
  const { admin } = await searchParams;
  const [stats, initialData] = await Promise.all([getStats(), getFirstPage()]);

  return (
    <main className="max-w-7xl mx-auto px-5 py-8 space-y-6">
      <Breadcrumb items={[
        { label: "Inicio", href: "/" },
        { label: "Redes empresariales" },
      ]} />

      <div className="space-y-2">
        <h1
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Redes empresariales
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Personas que figuran como administradoras (Adm. Único, Solidario o Mancomunado)
          en varias empresas que han recibido contratos públicos. Datos del BORME cruzados
          con la Plataforma de Contratación del Estado.
        </p>
      </div>

      {/* Nota explicativa */}
      <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-900/10 px-4 py-3 text-xs text-muted-foreground leading-relaxed max-w-2xl">
        <span className="font-semibold text-foreground">¿Por qué es relevante?</span>{" "}
        Ser administrador de una empresa implica control y responsabilidad sobre ella. Que una
        misma persona dirija varias sociedades que reciben dinero público puede indicar un grupo
        empresarial que concentra adjudicaciones, o contratos repartidos entre empresas
        aparentemente independientes.{" "}
        <span className="text-foreground">Los simples apoderados están excluidos</span>{" "}
        — tener poder notarial en varias empresas es habitual y no implica relación entre ellas.
      </div>

      {/* Stats chips */}
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-muted/50 border border-border">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Personas en red
          </span>
          <span className="tabnum text-lg font-bold text-primary" style={{ fontFamily: "var(--font-mono)" }}>
            {Number(stats.total).toLocaleString("es-ES")}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-muted/50 border border-border">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Empresas vinculadas
          </span>
          <span className="tabnum text-lg font-bold" style={{ fontFamily: "var(--font-mono)" }}>
            {Number(stats.empresas).toLocaleString("es-ES")}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-muted/50 border border-border">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Contratos adjudicados
          </span>
          <span className="tabnum text-lg font-bold" style={{ fontFamily: "var(--font-mono)" }}>
            {Number(stats.contratos).toLocaleString("es-ES")}
          </span>
        </div>
      </div>

      <RedesTable initialData={initialData} initialCursor={PAGE_SIZE} initialExpanded={admin ?? null} />
    </main>
  );
}
