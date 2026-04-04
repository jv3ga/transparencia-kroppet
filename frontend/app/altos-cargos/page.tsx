import pool from "@/lib/cockroach";
import SueldosTable from "./sueldos-table";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Sueldo = {
  id: number;
  anyo: number;
  alto_cargo: string;
  organismo: string | null;
  ministerio: string | null;
  retribucion: number | null;
};

async function getFirstPage(q?: string, anyo?: string): Promise<Sueldo[]> {
  const params: unknown[] = [];
  const where: string[] = [];

  if (q)    where.push(`(alto_cargo ILIKE $${params.push(`%${q}%`)} OR ministerio ILIKE $${params.push(`%${q}%`)})`);
  if (anyo) where.push(`anyo = $${params.push(parseInt(anyo, 10))}`);

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  params.push(PAGE_SIZE);
  const limitIdx = params.length;

  const { rows } = await pool.query(
    `SELECT id, anyo, alto_cargo, organismo, ministerio, retribucion
     FROM sueldos
     ${whereClause}
     ORDER BY retribucion DESC NULLS LAST, id DESC
     LIMIT $${limitIdx}`,
    params
  );
  return rows as Sueldo[];
}

export default async function AltosCargoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; anyo?: string }>;
}) {
  const { q, anyo } = await searchParams;
  const initialData = await getFirstPage(q, anyo);

  return (
    <main className="max-w-7xl mx-auto px-5 py-8">
      <div className="mb-6 space-y-2">
        <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Sueldos de altos cargos" }]} />
        <h1
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Sueldos de altos cargos
        </h1>
        <p className="text-xs text-muted-foreground">
          Fuente: Portal de Transparencia del Gobierno de España · Retribuciones íntegras anuales
        </p>
      </div>
      <SueldosTable
        initialData={initialData}
        initialCursor={PAGE_SIZE}
        initialQ={q ?? ""}
        initialAnio={anyo ?? ""}
      />
    </main>
  );
}
