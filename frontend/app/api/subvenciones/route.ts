import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/cockroach";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q      = searchParams.get("q")      ?? "";
  const nivel1 = searchParams.get("nivel1") ?? "";
  const anio   = searchParams.get("anio")   ?? "";
  const nif    = searchParams.get("nif")    ?? "";
  const cursor = parseInt(searchParams.get("cursor") ?? "0", 10);

  const params: unknown[] = [];
  const where: string[] = [];

  if (q)      where.push(`(beneficiario ILIKE $${params.push(`%${q}%`)} OR convocatoria ILIKE $${params.push(`%${q}%`)})`);
  if (nivel1) where.push(`nivel1 = $${params.push(nivel1)}`);
  if (nif)    where.push(`nif_beneficiario = $${params.push(nif)}`);
  if (anio) {
    where.push(`fecha_concesion >= $${params.push(`${anio}-01-01`)}`);
    where.push(`fecha_concesion <= $${params.push(`${anio}-12-31`)}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const limitIdx  = params.push(PAGE_SIZE);
  const offsetIdx = params.push(cursor);

  const sql = `
    SELECT id, cod_concesion, fecha_concesion, beneficiario, instrumento,
           importe, convocatoria, nivel1, nivel2, nivel3
    FROM subvenciones
    ${whereClause}
    ORDER BY fecha_concesion DESC NULLS LAST, id DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  try {
    const { rows } = await pool.query(sql, params);
    return NextResponse.json({
      data: rows,
      nextCursor: rows.length === PAGE_SIZE ? cursor + PAGE_SIZE : null,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
