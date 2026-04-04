import pool from "@/lib/cockroach";
import SubvencionesTable from "./subvenciones-table";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Subvencion = {
  id: number;
  cod_concesion: string | null;
  fecha_concesion: string | null;
  beneficiario: string | null;
  instrumento: string | null;
  importe: number | null;
  convocatoria: string | null;
  nivel1: string | null;
  nivel2: string | null;
  nivel3: string | null;
};

async function getFirstPage(q?: string, nivel1?: string, anio?: string): Promise<Subvencion[]> {
  const params: unknown[] = [];
  const where: string[] = [];

  if (q)      where.push(`(beneficiario ILIKE $${params.push(`%${q}%`)} OR convocatoria ILIKE $${params.push(`%${q}%`)})`);
  if (nivel1) where.push(`nivel1 = $${params.push(nivel1)}`);
  if (anio) {
    where.push(`fecha_concesion >= $${params.push(`${anio}-01-01`)}`);
    where.push(`fecha_concesion <= $${params.push(`${anio}-12-31`)}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  params.push(PAGE_SIZE);
  const limitIdx = params.length;

  const { rows } = await pool.query(
    `SELECT id, cod_concesion, fecha_concesion, beneficiario, instrumento,
            importe, convocatoria, nivel1, nivel2, nivel3
     FROM subvenciones
     ${whereClause}
     ORDER BY fecha_concesion DESC NULLS LAST, id DESC
     LIMIT $${limitIdx}`,
    params
  );
  return rows as Subvencion[];
}

export default async function SubvencionesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; nivel1?: string; anio?: string }>;
}) {
  const { q, nivel1, anio } = await searchParams;
  const initialData = await getFirstPage(q, nivel1, anio);

  return (
    <main className="max-w-7xl mx-auto px-5 py-8">
      <div className="mb-6">
        <h1
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Subvenciones
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Fuente: Base de Datos Nacional de Subvenciones (BDNS)
        </p>
      </div>
      <SubvencionesTable
        initialData={initialData}
        initialCursor={PAGE_SIZE}
        initialQ={q ?? ""}
        initialNivel1={nivel1 ?? ""}
        initialAnio={anio ?? ""}
      />
    </main>
  );
}
