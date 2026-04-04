import { notFound } from "next/navigation";
import { supabase, type Contrato } from "@/lib/supabase";
import ContratosTable from "@/app/contratos/contratos-table";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ProfileCharts } from "@/components/profile-charts";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

async function getEmpresa(id: number) {
  const [{ data: empresa }, { data: ranking }] = await Promise.all([
    supabase.from("empresas").select("id, nombre, nif").eq("id", id).single(),
    supabase.from("empresa_ranking").select("num_contratos, total_importe").eq("id", id).single(),
  ]);
  if (!empresa) return null;
  return {
    ...empresa,
    num_contratos: ranking?.num_contratos ?? 0,
    total_importe: ranking?.total_importe ?? 0,
  };
}

async function getContratos(empresa_id: number): Promise<Contrato[]> {
  const { data } = await supabase
    .from("contratos")
    .select(`
      id, expediente, objeto, tipo_contrato, procedimiento,
      importe_sin_iva, importe_con_iva, estado, url_fuente,
      fecha_adjudicacion, fecha_publicacion,
      empresas ( nombre, nif ),
      organos  ( nombre )
    `)
    .eq("empresa_id", empresa_id)
    .order("fecha_publicacion", { ascending: false })
    .order("id", { ascending: false })
    .range(0, PAGE_SIZE - 1);
  return (data ?? []) as unknown as Contrato[];
}

function fmtEuros(n: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export default async function EmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const empresaId = parseInt(id, 10);
  if (isNaN(empresaId)) notFound();

  const [empresa, initialData] = await Promise.all([
    getEmpresa(empresaId),
    getContratos(empresaId),
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
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-muted/50 border border-border">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Contratos adjudicados
            </span>
            <span
              className="tabnum text-lg font-bold text-primary"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {empresa.num_contratos.toLocaleString("es-ES")}
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
              {fmtEuros(empresa.total_importe)}
            </span>
          </div>
        </div>
      </div>

      {/* Gráficas */}
      <ProfileCharts entityId={empresaId} type="empresa" barLabel="Órganos contratantes" />

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
          initialEmpresaId={String(empresaId)}
        />
      </div>
    </main>
  );
}
