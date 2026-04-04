// NOTE: This route depends on the `empresa_ranking` view in the database.
// Create it with:
//
//   CREATE OR REPLACE VIEW empresa_ranking AS
//   SELECT
//     e.id,
//     e.nombre,
//     e.nif,
//     COUNT(c.id)           AS num_contratos,
//     SUM(c.importe_sin_iva) AS total_importe
//   FROM empresas e
//   JOIN contratos c ON c.empresa_id = e.id
//   WHERE c.importe_sin_iva IS NOT NULL
//   GROUP BY e.id, e.nombre, e.nif;

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
    .from("empresa_ranking")
    .select("*")
    .order(col, { ascending: asc, nullsFirst: false })
    .order("id", { ascending: false })
    .range(cursor, cursor + PAGE_SIZE - 1);

  if (q) query = query.or(`nombre.ilike.%${q}%,nif.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: data ?? [],
    nextCursor: (data?.length ?? 0) === PAGE_SIZE ? cursor + PAGE_SIZE : null,
  });
}
