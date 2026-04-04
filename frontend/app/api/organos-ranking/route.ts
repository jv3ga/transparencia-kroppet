import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/cockroach";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q        = searchParams.get("q") ?? "";
  const cursor   = parseInt(searchParams.get("cursor") ?? "0", 10);
  const sort_col = searchParams.get("sort_col") ?? "total_importe";
  const sort_dir = searchParams.get("sort_dir") ?? "desc";
  const VALID_SORT = ["total_importe", "num_contratos"];
  const col = VALID_SORT.includes(sort_col) ? sort_col : "total_importe";
  const dir = sort_dir === "asc" ? "ASC" : "DESC";

  const params: unknown[] = [];
  const where = q ? `WHERE nombre ILIKE $${params.push(`%${q}%`)}` : "";
  const limitIdx  = params.push(PAGE_SIZE);
  const offsetIdx = params.push(cursor);

  const sql = `
    SELECT id, nombre, codigo, num_contratos, total_importe
    FROM organo_ranking
    ${where}
    ORDER BY ${col} ${dir} NULLS LAST, id DESC
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
