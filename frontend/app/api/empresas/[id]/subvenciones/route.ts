import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/cockroach";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    // Get NIF for this empresa
    const { rows: empRows } = await pool.query(
      "SELECT nif FROM empresas WHERE id = $1",
      [id]
    );
    const nif = empRows[0]?.nif;
    if (!nif) return NextResponse.json({ total: 0, count: 0, items: [] });

    const [statsRes, itemsRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS count, SUM(importe) AS total
         FROM subvenciones WHERE nif_beneficiario = $1`,
        [nif]
      ),
      pool.query(
        `SELECT id, cod_concesion, fecha_concesion, beneficiario,
                convocatoria, instrumento, importe, nivel1, nivel2, nivel3
         FROM subvenciones
         WHERE nif_beneficiario = $1
         ORDER BY fecha_concesion DESC NULLS LAST, id DESC
         LIMIT 10`,
        [nif]
      ),
    ]);

    return NextResponse.json({
      nif,
      count: statsRes.rows[0].count,
      total: statsRes.rows[0].total,
      items: itemsRes.rows,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
