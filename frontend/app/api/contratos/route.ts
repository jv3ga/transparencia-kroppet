import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/cockroach";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q          = searchParams.get("q")          ?? "";
  const estado     = searchParams.get("estado")     ?? "";
  const organo_id  = searchParams.get("organo_id")  ?? "";
  const empresa_id = searchParams.get("empresa_id") ?? "";
  const tipo       = searchParams.get("tipo")       ?? "";
  const anio       = searchParams.get("anio")       ?? "";
  const cursor     = parseInt(searchParams.get("cursor") ?? "0", 10);

  const sort_col = searchParams.get("sort_col") ?? "fecha_publicacion";
  const sort_dir = searchParams.get("sort_dir") ?? "desc";
  const VALID_SORT = ["fecha_publicacion", "importe_sin_iva"];
  const col = VALID_SORT.includes(sort_col) ? sort_col : "fecha_publicacion";
  const dir = sort_dir === "asc" ? "ASC" : "DESC";

  const params: unknown[] = [];
  const where: string[] = [];

  if (q)          where.push(`c.objeto ILIKE $${params.push(`%${q}%`)}`);
  if (estado)     where.push(`c.estado = $${params.push(estado)}`);
  if (organo_id)  where.push(`c.organo_id = $${params.push(organo_id)}`);
  if (empresa_id) where.push(`c.empresa_id = $${params.push(empresa_id)}`);
  if (tipo)       where.push(`c.tipo_contrato = $${params.push(tipo)}`);
  if (anio) {
    where.push(`c.fecha_publicacion >= $${params.push(`${anio}-01-01`)}`);
    where.push(`c.fecha_publicacion <= $${params.push(`${anio}-12-31`)}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const limitIdx  = params.push(PAGE_SIZE);
  const offsetIdx = params.push(cursor);

  const sql = `
    SELECT
      c.id, c.expediente, c.objeto, c.tipo_contrato, c.procedimiento,
      c.importe_sin_iva, c.importe_con_iva, c.estado, c.url_fuente,
      c.fecha_adjudicacion, c.fecha_publicacion,
      e.nombre AS empresa_nombre, e.nif AS empresa_nif,
      o.nombre AS organo_nombre
    FROM contratos c
    LEFT JOIN empresas e ON e.id = c.empresa_id
    LEFT JOIN organos  o ON o.id = c.organo_id
    ${whereClause}
    ORDER BY c.${col} ${dir} NULLS LAST, c.id DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  try {
    const { rows } = await pool.query(sql, params);
    const data = rows.map(r => ({
      id:                 r.id,
      expediente:         r.expediente,
      objeto:             r.objeto,
      tipo_contrato:      r.tipo_contrato,
      procedimiento:      r.procedimiento,
      importe_sin_iva:    r.importe_sin_iva,
      importe_con_iva:    r.importe_con_iva,
      estado:             r.estado,
      url_fuente:         r.url_fuente,
      fecha_adjudicacion: r.fecha_adjudicacion,
      fecha_publicacion:  r.fecha_publicacion,
      empresas: r.empresa_nombre ? { nombre: r.empresa_nombre, nif: r.empresa_nif } : null,
      organos:  r.organo_nombre  ? { nombre: r.organo_nombre }                      : null,
    }));
    return NextResponse.json({
      data,
      nextCursor: rows.length === PAGE_SIZE ? cursor + PAGE_SIZE : null,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
