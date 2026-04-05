import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/cockroach";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const [organoRes, rankingRes] = await Promise.all([
      pool.query("SELECT id, nombre, codigo FROM organos WHERE id = $1", [id]),
      pool.query("SELECT num_contratos, total_importe FROM organo_ranking WHERE id = $1", [id]),
    ]);

    if (!organoRes.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      ...organoRes.rows[0],
      num_contratos: rankingRes.rows[0]?.num_contratos ?? 0,
      total_importe: rankingRes.rows[0]?.total_importe ?? 0,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
