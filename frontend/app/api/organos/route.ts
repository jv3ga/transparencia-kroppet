import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/cockroach";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";

  const params: unknown[] = [];
  const where = q ? `WHERE nombre ILIKE $${params.push(`%${q}%`)}` : "";
  params.push(50);
  const limitIdx = params.length;

  try {
    const { rows } = await pool.query(
      `SELECT id, nombre FROM organos ${where} ORDER BY nombre LIMIT $${limitIdx}`,
      params
    );
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
