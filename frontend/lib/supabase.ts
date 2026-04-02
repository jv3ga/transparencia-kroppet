import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type Contrato = {
  id: number;
  expediente: string | null;
  objeto: string;
  tipo_contrato: string | null;
  procedimiento: string | null;
  importe_sin_iva: number | null;
  importe_con_iva: number | null;
  estado: string | null;
  url_fuente: string | null;
  fecha_adjudicacion: string | null;
  fecha_publicacion: string | null;
  empresas: { nombre: string; nif: string } | null;
  organos: { nombre: string } | null;
};
