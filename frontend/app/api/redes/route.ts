import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/cockroach";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q      = searchParams.get("q")      ?? "";
  const min    = parseInt(searchParams.get("min") ?? "2", 10);
  const sort   = searchParams.get("sort")   ?? "num_empresas";
  const cursor = parseInt(searchParams.get("cursor") ?? "0", 10);

  const VALID_SORT: Record<string, string> = {
    num_empresas:    "num_empresas",
    total_contratos: "total_contratos",
    total_importe:   "total_importe",
  };
  const col = VALID_SORT[sort] ?? "num_empresas";

  const params: unknown[] = [];
  const where: string[] = [`num_empresas >= $${params.push(min)}`];
  if (q) where.push(`administrador ILIKE $${params.push(`%${q}%`)}`);

  const whereClause = `WHERE ${where.join(" AND ")}`;
  const limitIdx  = params.push(PAGE_SIZE);
  const offsetIdx = params.push(cursor);

  try {
    const { rows } = await pool.query(
      `SELECT administrador, num_empresas, total_contratos, total_importe, empresas
       FROM administrador_redes
       ${whereClause}
       ORDER BY ${col} DESC NULLS LAST, administrador ASC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );
    return NextResponse.json({
      data: rows,
      nextCursor: rows.length === PAGE_SIZE ? cursor + PAGE_SIZE : null,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
