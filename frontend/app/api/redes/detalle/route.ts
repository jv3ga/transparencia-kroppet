import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/cockroach";

export async function GET(req: NextRequest) {
  const nombre = req.nextUrl.searchParams.get("nombre") ?? "";
  if (!nombre) return NextResponse.json({ error: "nombre requerido" }, { status: 400 });

  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (ba.empresa_id)
         ba.empresa_id::text AS empresa_id,
         ba.empresa_nombre,
         e.nif,
         ba.cargo,
         ba.tipo_acto,
         ba.fecha_publicacion,
         COALESCE(er.num_contratos, 0)  AS num_contratos,
         COALESCE(er.total_importe, 0)  AS total_importe
       FROM borme_administradores ba
       JOIN empresas e      ON e.id  = ba.empresa_id
       JOIN empresa_ranking er ON er.id = ba.empresa_id
       WHERE ba.administrador = $1
         AND ba.empresa_id IS NOT NULL
       ORDER BY ba.empresa_id, ba.fecha_publicacion DESC`,
      [nombre]
    );
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
