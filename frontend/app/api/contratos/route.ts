import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "edge";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q      = searchParams.get("q")      ?? "";
  const estado = searchParams.get("estado") ?? "";
  const cursor = parseInt(searchParams.get("cursor") ?? "0", 10);

  let query = supabase
    .from("contratos")
    .select(`
      id, expediente, objeto, tipo_contrato, procedimiento,
      importe_sin_iva, importe_con_iva, estado, url_fuente,
      fecha_adjudicacion, fecha_publicacion,
      empresas ( nombre, nif ),
      organos  ( nombre )
    `)
    .order("fecha_publicacion", { ascending: false })
    .range(cursor, cursor + PAGE_SIZE - 1);

  if (q)      query = query.ilike("objeto", `%${q}%`);
  if (estado) query = query.eq("estado", estado);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: data ?? [],
    nextCursor: (data?.length ?? 0) === PAGE_SIZE ? cursor + PAGE_SIZE : null,
  });
}
