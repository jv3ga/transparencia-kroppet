import { supabase, type Contrato } from "@/lib/supabase";
import ContratosTable from "./contratos-table";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

async function getFirstPage(q?: string, estado?: string): Promise<Contrato[]> {
  let req = supabase
    .from("contratos")
    .select(`
      id, expediente, objeto, tipo_contrato, procedimiento,
      importe_sin_iva, importe_con_iva, estado, url_fuente,
      fecha_adjudicacion, fecha_publicacion,
      empresas ( nombre, nif ),
      organos  ( nombre )
    `)
    .order("fecha_publicacion", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  if (q)      req = req.ilike("objeto", `%${q}%`);
  if (estado) req = req.eq("estado", estado);

  const { data } = await req;
  return (data ?? []) as unknown as Contrato[];
}

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const { q, estado } = await searchParams;
  const initialData = await getFirstPage(q, estado);

  return (
    <main className="max-w-7xl mx-auto px-5 py-8">
      <div className="mb-6">
        <h1
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Contratos públicos
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Fuente: Plataforma de Contratación del Sector Público
        </p>
      </div>
      <ContratosTable
        initialData={initialData}
        initialCursor={PAGE_SIZE}
        initialQ={q ?? ""}
        initialEstado={estado ?? ""}
      />
    </main>
  );
}
