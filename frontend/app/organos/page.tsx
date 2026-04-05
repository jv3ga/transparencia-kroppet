import pool from "@/lib/cockroach";
import OrganoTable from "./organo-table";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

async function getFirstPage(q?: string) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (q) where.push(`nombre ILIKE $${params.push(`%${q}%`)}`);
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  params.push(PAGE_SIZE);

  const { rows } = await pool.query(
    `SELECT id, nombre, codigo, num_contratos, total_importe
     FROM organo_ranking
     ${whereClause}
     ORDER BY total_importe DESC NULLS LAST, id DESC
     LIMIT $${params.length}`,
    params
  );
  return rows;
}

export default async function OrganoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const initialData = await getFirstPage(q);

  return (
    <main className="max-w-7xl mx-auto px-5 py-8">
      <div className="mb-6 space-y-2">
        <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Órganos" }]} />
        <h1
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Órganos contratantes
        </h1>
        <p className="text-xs text-muted-foreground">
          Ranking por importe total contratado · Fuente: PLACE
        </p>
      </div>
      <OrganoTable initialData={initialData} initialCursor={PAGE_SIZE} initialQ={q ?? ""} />
    </main>
  );
}
