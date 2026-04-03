import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "edge";
export const revalidate = 3600;

export async function GET() {
  const [
    { count: contratos },
    { count: empresas },
    { count: organos },
    { count: subvenciones },
    { data: volData },
  ] = await Promise.all([
    supabase.from("contratos").select("*", { count: "exact", head: true }),
    supabase.from("empresas").select("*", { count: "exact", head: true }),
    supabase.from("organos").select("*", { count: "exact", head: true }),
    supabase.from("subvenciones").select("*", { count: "exact", head: true }),
    supabase.rpc("sum_importe_contratos"),
  ]);

  return NextResponse.json({
    contratos:    contratos    ?? 0,
    empresas:     empresas     ?? 0,
    organos:      organos      ?? 0,
    subvenciones: subvenciones ?? 0,
    volumen:      (volData as unknown as number) ?? 0,
  });
}
