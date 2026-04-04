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

  const { data, error } = await supabase.rpc("get_empresa_charts", { p_empresa_id: empresaId });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
