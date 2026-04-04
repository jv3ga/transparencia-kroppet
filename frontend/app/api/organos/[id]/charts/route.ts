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

  const { data, error } = await supabase.rpc("get_organo_charts", { p_organo_id: organoId });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
