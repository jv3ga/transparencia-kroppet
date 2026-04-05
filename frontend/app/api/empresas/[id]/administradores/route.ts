import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/cockroach";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const { rows } = await pool.query(
      `SELECT id, administrador, cargo, tipo_acto, fecha_publicacion, vigente
       FROM borme_administradores
       WHERE empresa_id = $1
       ORDER BY fecha_publicacion DESC, id DESC`,
      [id]
    );

    // Return string IDs to avoid bigint precision loss
    return NextResponse.json(
      rows.map(r => ({ ...r, id: String(r.id) }))
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
