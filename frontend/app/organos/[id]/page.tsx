import { notFound } from "next/navigation";
import pool from "@/lib/cockroach";
import type { Contrato } from "@/lib/supabase";
import ContratosTable from "@/app/contratos/contratos-table";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ProfileCharts } from "@/components/profile-charts";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

async function getOrgano(id: string) {
  const [organoRes, rankingRes] = await Promise.all([
    pool.query("SELECT id, nombre, codigo FROM organos WHERE id = $1", [id]),
    pool.query("SELECT num_contratos, total_importe FROM organo_ranking WHERE id = $1", [id]),
  ]);
  if (!organoRes.rows[0]) return null;
  return {
    ...organoRes.rows[0],
    num_contratos: rankingRes.rows[0]?.num_contratos ?? 0,
    total_importe:  rankingRes.rows[0]?.total_importe  ?? 0,
  };
}

async function getContratos(organo_id: string): Promise<Contrato[]> {
  const { rows } = await pool.query(
    `SELECT c.id, c.expediente, c.objeto, c.tipo_contrato, c.procedimiento,
            c.importe_sin_iva, c.importe_con_iva, c.estado, c.url_fuente,
            c.fecha_adjudicacion, c.fecha_publicacion,
            jsonb_build_object('id', e.id::text, 'nombre', e.nombre, 'nif', e.nif) AS empresas,
            jsonb_build_object('nombre', o.nombre)               AS organos
     FROM contratos c
     LEFT JOIN empresas e ON e.id = c.empresa_id
     LEFT JOIN organos  o ON o.id = c.organo_id
     WHERE c.organo_id = $1
     ORDER BY c.fecha_publicacion DESC NULLS LAST, c.id DESC
     LIMIT $2`,
    [organo_id, PAGE_SIZE]
  );
  return rows as unknown as Contrato[];
}

function fmtEuros(n: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export default async function OrganoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const [organo, initialData] = await Promise.all([
    getOrgano(id),
    getContratos(id),
  ]);

  if (!organo) notFound();

  return (
    <main className="max-w-7xl mx-auto px-5 py-8 space-y-6">
      <Breadcrumb items={[
        { label: "Inicio", href: "/" },
        { label: "Órganos", href: "/organos" },
        { label: organo.nombre },
      ]} />

      {/* Header */}
      <div className="space-y-3">
        <div>
          <h1
            className="text-xl font-bold tracking-tight leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {organo.nombre}
          </h1>
          {organo.codigo && (
            <p
              className="text-xs text-muted-foreground tabnum mt-1"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Código: {organo.codigo}
            </p>
          )}
        </div>

        {/* Stats chips */}
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-muted/50 border border-border">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Contratos adjudicados
            </span>
            <span
              className="tabnum text-lg font-bold text-primary"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {organo.num_contratos.toLocaleString("es-ES")}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-muted/50 border border-border">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Importe total (sin IVA)
            </span>
            <span
              className="tabnum text-lg font-bold"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {fmtEuros(organo.total_importe)}
            </span>
          </div>
        </div>
      </div>

      {/* Gráficas */}
      <ProfileCharts entityId={id} type="organo" barLabel="Empresas adjudicatarias" />

      {/* Contratos */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <h2
            className="text-xs font-semibold tracking-widest uppercase text-muted-foreground whitespace-nowrap"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Contratos
          </h2>
          <div className="flex-1 h-px bg-border" />
        </div>
        <ContratosTable
          initialData={initialData}
          initialCursor={PAGE_SIZE}
          initialQ=""
          initialEstado=""
          initialOrganoId={id}
          initialOrganoNombre={organo.nombre}
        />
      </div>
    </main>
  );
}
