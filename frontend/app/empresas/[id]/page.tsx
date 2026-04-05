import { notFound } from "next/navigation";
import pool from "@/lib/cockroach";
import type { Contrato } from "@/lib/supabase";
import ContratosTable from "@/app/contratos/contratos-table";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ProfileCharts } from "@/components/profile-charts";
import { EmpresaSubvenciones } from "@/components/empresa-subvenciones";
import { EmpresaAdministradores } from "@/components/empresa-administradores";
import { fmtCompact } from "@/lib/constants";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

async function getEmpresa(id: string) {
  const [empresaRes, rankingRes] = await Promise.all([
    pool.query("SELECT id, nombre, nif FROM empresas WHERE id = $1", [id]),
    pool.query("SELECT num_contratos, total_importe FROM empresa_ranking WHERE id = $1", [id]),
  ]);
  if (!empresaRes.rows[0]) return null;
  const empresa = {
    ...empresaRes.rows[0],
    num_contratos:    rankingRes.rows[0]?.num_contratos ?? 0,
    total_importe:     rankingRes.rows[0]?.total_importe  ?? 0,
    num_subvenciones: 0,
    total_subvenciones: null as number | null,
  };

  if (empresa.nif) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n, SUM(importe) AS total
       FROM subvenciones WHERE nif_beneficiario = $1`,
      [empresa.nif]
    );
    empresa.num_subvenciones   = rows[0]?.n     ?? 0;
    empresa.total_subvenciones = rows[0]?.total ?? null;
  }

  return empresa;
}

async function getContratos(empresa_id: string): Promise<Contrato[]> {
  const { rows } = await pool.query(
    `SELECT c.id, c.expediente, c.objeto, c.tipo_contrato, c.procedimiento,
            c.importe_sin_iva, c.importe_con_iva, c.estado, c.url_fuente,
            c.fecha_adjudicacion, c.fecha_publicacion,
            jsonb_build_object('nombre', e.nombre, 'nif', e.nif) AS empresas,
            jsonb_build_object('nombre', o.nombre)               AS organos
     FROM contratos c
     LEFT JOIN empresas e ON e.id = c.empresa_id
     LEFT JOIN organos  o ON o.id = c.organo_id
     WHERE c.empresa_id = $1
     ORDER BY c.fecha_publicacion DESC NULLS LAST, c.id DESC
     LIMIT $2`,
    [empresa_id, PAGE_SIZE]
  );
  return rows as unknown as Contrato[];
}

function fmtEuros(n: number) {
  return fmtCompact(n);
}

export default async function EmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const [empresa, initialData] = await Promise.all([
    getEmpresa(id),
    getContratos(id),
  ]);

  if (!empresa) notFound();

  return (
    <main className="max-w-7xl mx-auto px-5 py-8 space-y-6">
      <Breadcrumb items={[
        { label: "Inicio", href: "/" },
        { label: "Empresas", href: "/empresas" },
        { label: empresa.nombre },
      ]} />

      {/* Header */}
      <div className="space-y-3">
        <div>
          <h1
            className="text-xl font-bold tracking-tight leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {empresa.nombre}
          </h1>
          {empresa.nif && (
            <p
              className="text-xs text-muted-foreground tabnum mt-1"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              NIF: {empresa.nif}
            </p>
          )}
        </div>

        {/* Stats chips */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
          {/* Contratos */}
          <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-muted/50 border border-border min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">
              Contratos adjudicados
            </span>
            <span className="tabnum text-lg font-bold text-primary truncate" style={{ fontFamily: "var(--font-mono)" }}>
              {empresa.num_contratos.toLocaleString("es-ES")}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-muted/50 border border-border min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">
              Importe contratos (sin IVA)
            </span>
            <span className="tabnum text-lg font-bold truncate" style={{ fontFamily: "var(--font-mono)" }}>
              {fmtEuros(empresa.total_importe)}
            </span>
          </div>

          {/* Subvenciones */}
          {empresa.num_subvenciones > 0 && (
            <>
              <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-muted/50 border border-border min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">
                  Subvenciones recibidas
                </span>
                <span className="tabnum text-lg font-bold text-primary truncate" style={{ fontFamily: "var(--font-mono)" }}>
                  {empresa.num_subvenciones.toLocaleString("es-ES")}
                </span>
              </div>
              {empresa.total_subvenciones != null && (
                <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-muted/50 border border-border min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">
                    Importe subvenciones
                  </span>
                  <span className="tabnum text-lg font-bold truncate" style={{ fontFamily: "var(--font-mono)" }}>
                    {fmtEuros(empresa.total_subvenciones)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Gráficas */}
      <ProfileCharts entityId={id} type="empresa" barLabel="Órganos contratantes" />

      {/* Administradores BORME */}
      <EmpresaAdministradores empresaId={id} />

      {/* Subvenciones cruzadas */}
      <EmpresaSubvenciones empresaId={id} />

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
          initialEmpresaId={id}
        />
      </div>
    </main>
  );
}
