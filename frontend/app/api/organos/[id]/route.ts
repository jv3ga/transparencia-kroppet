import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "edge";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const organoId = parseInt(id, 10);
  if (isNaN(organoId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [{ data: organo }, { data: ranking }] = await Promise.all([
    supabase.from("organos").select("id, nombre, codigo").eq("id", organoId).single(),
    supabase.from("organo_ranking").select("num_contratos, total_importe").eq("id", organoId).single(),
  ]);

  if (!organo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...organo,
    num_contratos: ranking?.num_contratos ?? 0,
    total_importe: ranking?.total_importe ?? 0,
  });
}
