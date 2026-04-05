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

const VALID_SORT_COLS = ["retribucion", "anyo"] as const;
type SortCol = typeof VALID_SORT_COLS[number];

async function getFirstPage(
  q?: string, anyo?: string, ministerio?: string,
  sortCol: SortCol = "retribucion", sortDir: "asc" | "desc" = "desc"
): Promise<Sueldo[]> {
  const params: unknown[] = [];
  const where: string[] = [];

  if (q)          where.push(`(alto_cargo ILIKE $${params.push(`%${q}%`)} OR ministerio ILIKE $${params.push(`%${q}%`)})`);
  if (anyo)       where.push(`anyo = $${params.push(parseInt(anyo, 10))}`);
  if (ministerio) where.push(`ministerio = $${params.push(ministerio)}`);

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const dir = sortDir === "asc" ? "ASC" : "DESC";
  params.push(PAGE_SIZE);
  const limitIdx = params.length;

  const { rows } = await pool.query(
    `SELECT id, anyo, alto_cargo, organismo, ministerio, retribucion
     FROM sueldos
     ${whereClause}
     ORDER BY ${sortCol} ${dir} NULLS LAST, id DESC
     LIMIT $${limitIdx}`,
    params
  );
  return rows as Sueldo[];
}

async function getMinisterios(): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT ministerio FROM sueldos WHERE ministerio IS NOT NULL GROUP BY ministerio ORDER BY COUNT(*) DESC`
  );
  return rows.map((r: { ministerio: string }) => r.ministerio);
}

export default async function AltosCargoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; anyo?: string; ministerio?: string; sort_col?: string; sort_dir?: string }>;
}) {
  const { q, anyo, ministerio, sort_col, sort_dir } = await searchParams;
  const sortCol: SortCol = VALID_SORT_COLS.includes(sort_col as SortCol) ? (sort_col as SortCol) : "retribucion";
  const sortDir: "asc" | "desc" = sort_dir === "asc" ? "asc" : "desc";

  const [initialData, ministerios] = await Promise.all([
    getFirstPage(q, anyo, ministerio, sortCol, sortDir),
    getMinisterios(),
  ]);

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
        initialMinisterio={ministerio ?? ""}
        initialSortCol={sortCol}
        initialSortDir={sortDir}
        ministerios={ministerios}
      />
    </main>
  );
}
