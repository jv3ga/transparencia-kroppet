import pool from "@/lib/cockroach";
import type { Contrato } from "@/lib/supabase";
import ContratosTable from "./contratos-table";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

async function getFirstPage(
  q?: string, estado?: string, tipo?: string, anio?: string,
  empresa_id?: string, organo_id?: string
): Promise<Contrato[]> {
  const params: unknown[] = [];
  const where: string[] = [];

  if (q)          where.push(`c.objeto ILIKE $${params.push(`%${q}%`)}`);
  if (estado)     where.push(`c.estado = $${params.push(estado)}`);
  if (tipo)       where.push(`c.tipo_contrato = $${params.push(tipo)}`);
  if (anio) {
    where.push(`c.fecha_publicacion >= $${params.push(`${anio}-01-01`)}`);
    where.push(`c.fecha_publicacion <= $${params.push(`${anio}-12-31`)}`);
  }
  if (empresa_id) where.push(`c.empresa_id = $${params.push(empresa_id)}`);
  if (organo_id)  where.push(`c.organo_id = $${params.push(organo_id)}`);

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  params.push(PAGE_SIZE);

  const { rows } = await pool.query(
    `SELECT c.id, c.expediente, c.objeto, c.tipo_contrato, c.procedimiento,
            c.importe_sin_iva, c.importe_con_iva, c.estado, c.url_fuente,
            c.fecha_adjudicacion, c.fecha_publicacion,
            jsonb_build_object('id', e.id::text, 'nombre', e.nombre, 'nif', e.nif) AS empresas,
            jsonb_build_object('nombre', o.nombre)               AS organos
     FROM contratos c
     LEFT JOIN empresas e ON e.id = c.empresa_id
     LEFT JOIN organos  o ON o.id = c.organo_id
     ${whereClause}
     ORDER BY c.fecha_publicacion DESC NULLS LAST, c.id DESC
     LIMIT $${params.length}`,
    params
  );
  return rows as unknown as Contrato[];
}

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; tipo?: string; anio?: string; empresa_id?: string; organo_id?: string }>;
}) {
  const { q, estado, tipo, anio, empresa_id, organo_id } = await searchParams;
  const initialData = await getFirstPage(q, estado, tipo, anio, empresa_id, organo_id);

  return (
    <main className="max-w-7xl mx-auto px-5 py-8">
      <div className="mb-6 space-y-2">
        <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Contratos" }]} />
        <h1
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Contratos públicos
        </h1>
        <p className="text-xs text-muted-foreground">
          Fuente: Plataforma de Contratación del Sector Público
        </p>
      </div>
      <ContratosTable
        initialData={initialData}
        initialCursor={PAGE_SIZE}
        initialQ={q ?? ""}
        initialEstado={estado ?? ""}
        initialTipo={tipo ?? ""}
        initialAnio={anio ?? ""}
        initialFilterEmpresaId={empresa_id ?? ""}
        initialOrganoId={organo_id ?? ""}
      />
    </main>
  );
}
