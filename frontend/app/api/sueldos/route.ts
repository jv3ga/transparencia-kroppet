import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/cockroach";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q      = searchParams.get("q")      ?? "";
  const anyo   = searchParams.get("anyo")   ?? "";
  const cursor = parseInt(searchParams.get("cursor") ?? "0", 10);

  const sort_col = searchParams.get("sort_col") ?? "retribucion";
  const sort_dir = searchParams.get("sort_dir") ?? "desc";
  const VALID_SORT = ["retribucion", "anyo"];
  const col = VALID_SORT.includes(sort_col) ? sort_col : "retribucion";
  const dir = sort_dir === "asc" ? "ASC" : "DESC";

  const params: unknown[] = [];
  const where: string[] = [];

  if (q)    where.push(`(alto_cargo ILIKE $${params.push(`%${q}%`)} OR ministerio ILIKE $${params.push(`%${q}%`)})`);
  if (anyo) where.push(`anyo = $${params.push(parseInt(anyo, 10))}`);

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const limitIdx  = params.push(PAGE_SIZE);
  const offsetIdx = params.push(cursor);

  const sql = `
    SELECT id, anyo, alto_cargo, organismo, ministerio, retribucion
    FROM sueldos
    ${whereClause}
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
