import type { Contrato } from "@/lib/supabase";

const ESTADO_LABEL: Record<string, { label: string; color: string }> = {
  PUB: { label: "Publicado",     color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  ADJ: { label: "Adjudicado",    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  RES: { label: "Resuelto",      color: "bg-muted text-muted-foreground" },
  EV:  { label: "En evaluación", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  LIC: { label: "Licitación",    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
};

function fmtEuros(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export function ContratoCard({ c }: { c: Contrato }) {
  const est = ESTADO_LABEL[c.estado ?? ""] ?? { label: c.estado ?? "—", color: "bg-muted text-muted-foreground" };

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {c.url_fuente ? (
            <a href={c.url_fuente} target="_blank" rel="noopener noreferrer"
               className="text-primary hover:underline underline-offset-2 text-sm font-medium line-clamp-3 leading-snug">
              {c.objeto}
            </a>
          ) : (
            <span className="text-sm font-medium line-clamp-3 leading-snug">{c.objeto}</span>
          )}
        </div>
        <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${est.color}`}>
          {est.label}
        </span>
      </div>
      {c.organos?.nombre && (
        <p className="text-xs text-muted-foreground line-clamp-1">{c.organos.nombre}</p>
      )}
      <div className="flex items-end justify-between gap-2 pt-1 border-t border-border/50">
        <div className="min-w-0">
          {c.empresas?.nombre ? (
            <p className="text-xs line-clamp-1 font-medium">{c.empresas.nombre}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Sin empresa adjudicataria</p>
          )}
          {c.expediente && (
            <p className="text-[10px] text-muted-foreground tabnum mt-0.5"
               style={{ fontFamily: "var(--font-mono)" }}>
              {c.expediente}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="tabnum text-sm font-semibold text-primary"
             style={{ fontFamily: "var(--font-mono)" }}>
            {fmtEuros(c.importe_sin_iva)}
          </p>
          <p className="text-[10px] text-muted-foreground tabnum"
             style={{ fontFamily: "var(--font-mono)" }}>
            {fmtDate(c.fecha_adjudicacion ?? c.fecha_publicacion)}
          </p>
        </div>
      </div>
    </div>
  );
}
