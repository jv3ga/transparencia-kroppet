"use client";

import { useEffect, useState } from "react";

type AdminRecord = {
  id: string;
  administrador: string;
  cargo: string;
  tipo_acto: "nombramiento" | "cese";
  fecha_publicacion: string | null;
  vigente: boolean;
};

function fmtFecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const CARGO_SHORT: Record<string, string> = {
  "Adm. Único":       "Adm. Único",
  "Adm. Solidario":   "Adm. Solidario",
  "Adm. Mancomunado": "Adm. Mancomunado",
  "Consejero Delegado": "Cons. Delegado",
  "Liquidador":       "Liquidador",
  "Apoderado":        "Apoderado",
};

export function EmpresaAdministradores({ empresaId }: { empresaId: string }) {
  const [records, setRecords] = useState<AdminRecord[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/empresas/${empresaId}/administradores`)
      .then(r => r.json())
      .then(d => { setRecords(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [empresaId]);

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );

  if (!records || records.length === 0) return null;

  // Split into nombramientos and ceses
  const nombramientos = records.filter(r => r.tipo_acto === "nombramiento");
  const ceses = records.filter(r => r.tipo_acto === "cese");

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2
          className="text-xs font-semibold tracking-widest uppercase text-muted-foreground whitespace-nowrap"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Administradores (BORME)
        </h2>
        <div className="flex-1 h-px bg-border" />
        <span
          className="text-xs text-muted-foreground tabnum shrink-0 whitespace-nowrap"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {records.length} acto{records.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-4">
        {nombramientos.length > 0 && (
          <AdminGroup title="Nombramientos" records={nombramientos} color="text-green-600 dark:text-green-400" />
        )}
        {ceses.length > 0 && (
          <AdminGroup title="Ceses / Dimisiones" records={ceses} color="text-red-500 dark:text-red-400" />
        )}
      </div>
    </div>
  );
}

function AdminGroup({
  title,
  records,
  color,
}: {
  title: string;
  records: AdminRecord[];
  color: string;
}) {
  return (
    <div>
      <p className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${color}`}>
        {title}
      </p>
      <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
        {records.map(r => (
          <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 bg-muted/20 hover:bg-muted/40 transition-colors">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate capitalize-names">
                {toTitleCase(r.administrador)}
              </p>
              <p className="text-xs text-muted-foreground">
                {CARGO_SHORT[r.cargo] ?? r.cargo}
              </p>
            </div>
            <span
              className="text-xs text-muted-foreground tabnum shrink-0"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {fmtFecha(r.fecha_publicacion)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function toTitleCase(s: string) {
  return s
    .toLowerCase()
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
