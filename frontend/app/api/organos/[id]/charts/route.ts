import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/cockroach";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const [empresaRes, tipoRes] = await Promise.all([
      pool.query(`
        SELECT e.id, e.nombre,
               COUNT(c.id)::int        AS num_contratos,
               SUM(c.importe_sin_iva)  AS total_importe
        FROM contratos c
        JOIN empresas e ON e.id = c.empresa_id
        WHERE c.organo_id = $1 AND c.importe_sin_iva IS NOT NULL
        GROUP BY e.id, e.nombre
        ORDER BY total_importe DESC
        LIMIT 6
      `, [id]),
      pool.query(`
        SELECT tipo_contrato,
               COUNT(id)::int          AS num_contratos,
               SUM(importe_sin_iva)    AS total_importe
        FROM contratos
        WHERE organo_id = $1
          AND importe_sin_iva IS NOT NULL
          AND tipo_contrato IS NOT NULL
        GROUP BY tipo_contrato
        ORDER BY total_importe DESC
      `, [id]),
    ]);

    return NextResponse.json({
      top_empresas: empresaRes.rows,
      por_tipo:     tipoRes.rows,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
