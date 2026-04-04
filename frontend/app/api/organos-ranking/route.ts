import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "edge";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q        = searchParams.get("q") ?? "";
  const cursor   = parseInt(searchParams.get("cursor") ?? "0", 10);
  const sort_col = searchParams.get("sort_col") ?? "total_importe";
  const sort_dir = searchParams.get("sort_dir") ?? "desc";
  const VALID_SORT = ["total_importe", "num_contratos"];
  const col = VALID_SORT.includes(sort_col) ? sort_col : "total_importe";
  const asc = sort_dir === "asc";

  let query = supabase
    .from("organo_ranking")
    .select("*")
    .order(col, { ascending: asc, nullsFirst: false })
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
