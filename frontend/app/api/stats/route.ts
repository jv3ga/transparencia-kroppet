import { NextResponse } from "next/server";
import pool from "@/lib/cockroach";

export const revalidate = 3600;

export async function GET() {
  try {
    const [contratosRes, empresasRes, organosRes, subvencionesRes, volumenRes] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS n FROM contratos"),
      pool.query("SELECT COUNT(*)::int AS n FROM empresas"),
      pool.query("SELECT COUNT(*)::int AS n FROM organos"),
      pool.query("SELECT COUNT(*)::int AS n FROM subvenciones"),
      pool.query("SELECT SUM(importe_sin_iva) AS v FROM contratos"),
    ]);

    return NextResponse.json({
      contratos:    contratosRes.rows[0].n,
      empresas:     empresasRes.rows[0].n,
      organos:      organosRes.rows[0].n,
      subvenciones: subvencionesRes.rows[0].n,
      volumen:      Number(volumenRes.rows[0].v ?? 0),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
