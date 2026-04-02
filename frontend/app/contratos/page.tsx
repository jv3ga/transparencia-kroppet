import { supabase, type Contrato } from "@/lib/supabase";
import ContratosTable from "./contratos-table";

export const revalidate = 3600; // refresca cada hora

async function getContratos(query?: string, estado?: string): Promise<Contrato[]> {
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
    .limit(200);

  if (query) req = req.ilike("objeto", `%${query}%`);
  if (estado) req = req.eq("estado", estado);

  const { data, error } = await req;
  if (error) throw error;
  return (data ?? []) as unknown as Contrato[];
}

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const { q, estado } = await searchParams;
  const contratos = await getContratos(q, estado);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contratos públicos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fuente: Plataforma de Contratación del Sector Público
        </p>
      </div>
      <ContratosTable contratos={contratos} />
    </main>
  );
}
