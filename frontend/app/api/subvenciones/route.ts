import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "edge";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q      = searchParams.get("q")      ?? "";
  const nivel1 = searchParams.get("nivel1") ?? "";
  const anio   = searchParams.get("anio")   ?? "";
  const cursor = parseInt(searchParams.get("cursor") ?? "0", 10);

  let query = supabase
    .from("subvenciones")
    .select("id, cod_concesion, fecha_concesion, beneficiario, instrumento, importe, convocatoria, nivel1, nivel2, nivel3")
    .order("fecha_concesion", { ascending: false })
    .order("id", { ascending: false })
    .range(cursor, cursor + PAGE_SIZE - 1);

  if (q)      query = query.or(`beneficiario.ilike.%${q}%,convocatoria.ilike.%${q}%`);
  if (nivel1) query = query.eq("nivel1", nivel1);
  if (anio)   query = query.gte("fecha_concesion", `${anio}-01-01`)
                           .lte("fecha_concesion", `${anio}-12-31`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: data ?? [],
    nextCursor: (data?.length ?? 0) === PAGE_SIZE ? cursor + PAGE_SIZE : null,
  });
}
