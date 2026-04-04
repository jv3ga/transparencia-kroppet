import { supabase } from "@/lib/supabase";
import OrganoTable from "./organo-table";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

async function getFirstPage(q?: string) {
  let query = supabase
    .from("organo_ranking")
    .select("*")
    .order("total_importe", { ascending: false })
    .order("id", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  if (q) query = query.ilike("nombre", `%${q}%`);
  const { data } = await query;
  return data ?? [];
}

export default async function OrganoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const initialData = await getFirstPage(q);

  return (
    <main className="max-w-7xl mx-auto px-5 py-8">
      <div className="mb-6 space-y-2">
        <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Órganos" }]} />
        <h1
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Órganos contratantes
        </h1>
        <p className="text-xs text-muted-foreground">
          Ranking por importe total contratado · Fuente: PLACE
        </p>
      </div>
      <OrganoTable initialData={initialData} initialCursor={PAGE_SIZE} initialQ={q ?? ""} />
    </main>
  );
}
