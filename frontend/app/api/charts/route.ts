import { NextResponse } from "next/server";
import pool from "@/lib/cockroach";

export const revalidate = 3600;

export async function GET() {
  try {
    const [empresasRes, tiposRes] = await Promise.all([
      pool.query(`
        SELECT id, nombre, num_contratos, total_importe
        FROM empresa_ranking
        ORDER BY total_importe DESC NULLS LAST
        LIMIT 8
      `),
      pool.query(`
        SELECT tipo_contrato, num_contratos, total_importe
        FROM contratos_por_tipo
      `),
    ]);

    return NextResponse.json({
      topEmpresas: empresasRes.rows,
      porTipo:     tiposRes.rows,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
