import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "edge";
export const revalidate = 3600;

export async function GET() {
  const [{ data: empresas }, { data: tipos }] = await Promise.all([
    supabase
      .from("empresa_ranking")
      .select("id, nombre, num_contratos, total_importe")
      .order("total_importe", { ascending: false })
      .limit(8),
    supabase
      .from("contratos_por_tipo")
      .select("tipo_contrato, num_contratos, total_importe"),
  ]);

  return NextResponse.json({
    topEmpresas: empresas ?? [],
    porTipo: tipos ?? [],
  });
}
