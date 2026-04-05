"use client";

import { useState, useRef, useCallback, useEffect, Fragment } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { fmtCompact } from "@/lib/constants";

type EmpresaDetalle = {
  empresa_id: string;
  empresa_nombre: string;
  nif: string | null;
  cargo: string;
  fecha_publicacion: string | null;
  num_contratos: number;
  total_importe: number;
};

type Row = {
  administrador: string;
  num_empresas: number;
  total_contratos: number;
  total_importe: number;
  empresas: EmpresaDetalle[] | string | null;
};

function toTitleCase(s: string) {
  return s.toLowerCase().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function fmtFecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { year: "numeric", month: "short" });
}

function BadgeCount({ n }: { n: number }) {
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
      n >= 4 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : n >= 3 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : "bg-muted text-muted-foreground"
    }`}>
      {n}
    </span>
  );
}

function EmpresaDetalleContent({ nombre, empresas, onClose }: {
  nombre: string;
  empresas: EmpresaDetalle[] | string | null;
  onClose: () => void;
}) {
  const items: EmpresaDetalle[] = !empresas
    ? []
    : typeof empresas === "string"
    ? JSON.parse(empresas)
    : empresas;

  return (
    <div className="bg-muted/30 px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Empresas activas de {toTitleCase(nombre)}
        </p>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          Cerrar ✕
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map(r => (
          <Link
            key={r.empresa_id}
            href={`/empresas/${r.empresa_id}`}
            className="flex flex-col gap-0.5 px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-accent transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium leading-snug line-clamp-2">
                {toTitleCase(r.empresa_nombre)}
              </span>
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Activo
              </span>
            </div>
            {r.nif && (
              <span className="text-xs text-muted-foreground tabnum" style={{ fontFamily: "var(--font-mono)" }}>
                {r.nif}
              </span>
            )}
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span>{r.cargo}</span>
              <span className="tabnum" style={{ fontFamily: "var(--font-mono)" }}>
                {fmtFecha(r.fecha_publicacion)}
              </span>
              <span className="ml-auto tabnum font-medium text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                {r.num_contratos} contratos · {fmtCompact(r.total_importe)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function RedesTable({
  initialData,
  initialCursor,
  initialExpanded = null,
}: {
  initialData: Row[];
  initialCursor: number;
  initialExpanded?: string | null;
}) {
  const [rows, setRows]     = useState<Row[]>(initialData);
  const [cursor, setCursor] = useState<number | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [q, setQ]           = useState("");
  const [expanded, setExpanded] = useState<string | null>(initialExpanded);
  const sentinelRef  = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const activeQ      = useRef("");

  const fetchPage = useCallback(async (query: string, cur: number, replace: boolean) => {
    setLoading(true);
    const params = new URLSearchParams({ cursor: String(cur) });
    if (query) params.set("q", query);
    const res  = await fetch(`/api/redes?${params}`);
    const json = await res.json();
    setRows(prev => {
      const merged = replace ? (json.data ?? []) : [...prev, ...(json.data ?? [])];
      const seen = new Set<string>();
      return merged.filter((r: Row) => seen.has(r.administrador) ? false : (seen.add(r.administrador), true));
    });
    setCursor(json.nextCursor ?? null);
    setLoading(false);
  }, []);

  function handleSearch(val: string) {
    setQ(val);
    activeQ.current = val;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchPage(val, 0, true), 350);
  }

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && cursor !== null && !loading)
          fetchPage(activeQ.current, cursor, false);
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [cursor, loading, fetchPage]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Buscar administrador…"
          value={q}
          onChange={e => handleSearch(e.target.value)}
          className="max-w-xs"
        />
        <span className="text-xs text-muted-foreground tabnum ml-auto" style={{ fontFamily: "var(--font-mono)" }}>
          {rows.length.toLocaleString("es-ES")} cargados
          {cursor !== null && !loading && " · scroll para más"}
        </span>
      </div>

      {/* Tabla desktop */}
      <div className="hidden md:block rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Administrador
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Empresas activas
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Contratos
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Importe total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-muted-foreground text-sm">
                  Sin resultados
                </td>
              </tr>
            )}
            {rows.map(r => (
              <Fragment key={r.administrador}>
                <tr
                  onClick={() => setExpanded(e => e === r.administrador ? null : r.administrador)}
                  className={`cursor-pointer transition-colors ${
                    expanded === r.administrador ? "bg-primary/5" : "hover:bg-muted/30"
                  }`}
                >
                  <td className="px-4 py-3 font-medium">{toTitleCase(r.administrador)}</td>
                  <td className="px-4 py-3 text-right">
                    <BadgeCount n={r.num_empresas} />
                  </td>
                  <td className="px-4 py-3 text-right tabnum text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                    {Number(r.total_contratos).toLocaleString("es-ES")}
                  </td>
                  <td className="px-4 py-3 text-right tabnum font-medium" style={{ fontFamily: "var(--font-mono)" }}>
                    {fmtCompact(r.total_importe)}
                  </td>
                </tr>
                {expanded === r.administrador && (
                  <tr>
                    <td colSpan={4} className="p-0 border-t border-border">
                      <EmpresaDetalleContent
                        nombre={r.administrador}
                        empresas={r.empresas}
                        onClose={() => setExpanded(null)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards mobile */}
      <div className="md:hidden flex flex-col gap-2">
        {rows.length === 0 && !loading && (
          <p className="text-center py-12 text-muted-foreground text-sm">Sin resultados</p>
        )}
        {rows.map(r => (
          <div key={r.administrador} className="rounded-xl border border-border overflow-hidden">
            <button
              className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors"
              onClick={() => setExpanded(e => e === r.administrador ? null : r.administrador)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">{toTitleCase(r.administrador)}</span>
                <BadgeCount n={r.num_empresas} />
              </div>
              <div className="flex gap-3 mt-1 text-xs text-muted-foreground tabnum" style={{ fontFamily: "var(--font-mono)" }}>
                <span>{Number(r.total_contratos).toLocaleString("es-ES")} contratos</span>
                <span>·</span>
                <span>{fmtCompact(r.total_importe)}</span>
              </div>
            </button>
            {expanded === r.administrador && (
              <div className="border-t border-border">
                <EmpresaDetalleContent
                  nombre={r.administrador}
                  empresas={r.empresas}
                  onClose={() => setExpanded(null)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div ref={sentinelRef} className="h-1" />

      {loading && (
        <div className="flex justify-center py-6">
          <div className="flex gap-1">
            {[0,1,2].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
