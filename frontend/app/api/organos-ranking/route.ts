import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "edge";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q      = searchParams.get("q") ?? "";
  const cursor = parseInt(searchParams.get("cursor") ?? "0", 10);

  let query = supabase
    .from("organo_ranking")
    .select("*")
    .order("total_importe", { ascending: false })
    .order("id", { ascending: false })
    .range(cursor, cursor + PAGE_SIZE - 1);

  if (q) query = query.ilike("nombre", `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: data ?? [],
    nextCursor: (data?.length ?? 0) === PAGE_SIZE ? cursor + PAGE_SIZE : null,
  });
}
