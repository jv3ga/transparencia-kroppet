import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "edge";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const empresaId = parseInt(id, 10);
  if (isNaN(empresaId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [{ data: empresa }, { data: ranking }] = await Promise.all([
    supabase.from("empresas").select("id, nombre, nif").eq("id", empresaId).single(),
    supabase.from("empresa_ranking").select("num_contratos, total_importe").eq("id", empresaId).single(),
  ]);

  if (!empresa) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...empresa,
    num_contratos: ranking?.num_contratos ?? 0,
    total_importe: ranking?.total_importe ?? 0,
  });
}
