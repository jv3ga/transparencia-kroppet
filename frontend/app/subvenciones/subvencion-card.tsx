const NIVEL1_META: Record<string, { label: string; color: string }> = {
  "ESTADO":    { label: "Estatal",    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  "AUTONOMICA":{ label: "Autonómica", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  "LOCAL":     { label: "Local",      color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
};

function fmtEuros(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

type Subvencion = {
  id: number;
  cod_concesion: string | null;
  fecha_concesion: string | null;
  beneficiario: string | null;
  instrumento: string | null;
  importe: number | null;
  convocatoria: string | null;
  nivel1: string | null;
  nivel2: string | null;
  nivel3: string | null;
};

export function SubvencionCard({ s }: { s: Subvencion }) {
  const nivel1 = NIVEL1_META[s.nivel1 ?? ""] ?? { label: s.nivel1 ?? "", color: "bg-muted text-muted-foreground" };

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">
          {s.beneficiario ?? "—"}
        </p>
        {s.nivel1 && (
          <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${nivel1.color}`}>
            {nivel1.label}
          </span>
        )}
      </div>
      {s.convocatoria && (
        <p className="text-xs text-muted-foreground line-clamp-2">{s.convocatoria}</p>
      )}
      {s.nivel3 && (
        <p className="text-xs text-muted-foreground/60 line-clamp-1">{s.nivel3}</p>
      )}
      <div className="flex items-end justify-between gap-2 pt-1 border-t border-border/50">
        <p className="text-xs text-muted-foreground line-clamp-1 flex-1">
          {s.instrumento ?? "—"}
        </p>
        <div className="text-right shrink-0">
          <p className="tabnum text-sm font-semibold text-primary"
             style={{ fontFamily: "var(--font-mono)" }}>
            {fmtEuros(s.importe)}
          </p>
          <p className="text-[10px] text-muted-foreground tabnum"
             style={{ fontFamily: "var(--font-mono)" }}>
            {fmtDate(s.fecha_concesion)}
          </p>
        </div>
      </div>
    </div>
  );
}
