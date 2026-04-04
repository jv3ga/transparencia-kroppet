import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/cockroach";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const empresaId = parseInt(id, 10);
  if (isNaN(empresaId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const [organoRes, tipoRes] = await Promise.all([
      pool.query(`
        SELECT o.id, o.nombre,
               COUNT(c.id)::int        AS num_contratos,
               SUM(c.importe_sin_iva)  AS total_importe
        FROM contratos c
        JOIN organos o ON o.id = c.organo_id
        WHERE c.empresa_id = $1 AND c.importe_sin_iva IS NOT NULL
        GROUP BY o.id, o.nombre
        ORDER BY total_importe DESC
        LIMIT 6
      `, [empresaId]),
      pool.query(`
        SELECT tipo_contrato,
               COUNT(id)::int          AS num_contratos,
               SUM(importe_sin_iva)    AS total_importe
        FROM contratos
        WHERE empresa_id = $1
          AND importe_sin_iva IS NOT NULL
          AND tipo_contrato IS NOT NULL
        GROUP BY tipo_contrato
        ORDER BY total_importe DESC
      `, [empresaId]),
    ]);

    return NextResponse.json({
      top_organos: organoRes.rows,
      por_tipo:    tipoRes.rows,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
