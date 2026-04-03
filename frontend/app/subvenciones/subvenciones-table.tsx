"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ANIOS } from "@/lib/constants";
import { SubvencionCard } from "./subvencion-card";

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

const NIVEL1_META: Record<string, { label: string; color: string }> = {
  "ESTADO":     { label: "Estatal",    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  "AUTONOMICA": { label: "Autonómica", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  "LOCAL":      { label: "Local",      color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
};

const NIVEL1_OPTIONS = [
  { value: "ESTADO",     label: "Estatal" },
  { value: "AUTONOMICA", label: "Autonómica" },
  { value: "LOCAL",      label: "Local" },
];

function fmtEuros(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

type Filters = {
  q: string;
  nivel1: string;
  anio: string;
};

type Props = {
  initialData: Subvencion[];
  initialCursor: number;
  initialQ: string;
  initialNivel1: string;
  initialAnio: string;
};

export default function SubvencionesTable({
  initialData,
  initialCursor,
  initialQ,
  initialNivel1,
  initialAnio,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [rows, setRows]       = useState<Subvencion[]>(initialData);
  const [cursor, setCursor]   = useState<number | null>(initialCursor);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    q:      initialQ,
    nivel1: initialNivel1,
    anio:   initialAnio,
  });

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const sentinelRef   = useRef<HTMLDivElement>(null);
  const activeFilters = useRef<Filters>(filters);

  const fetchPage = useCallback(async (f: Filters, cur: number, replace: boolean) => {
    setLoading(true);
    const params = new URLSearchParams({ cursor: String(cur) });
    if (f.q)      params.set("q", f.q);
    if (f.nivel1) params.set("nivel1", f.nivel1);
    if (f.anio)   params.set("anio", f.anio);

    const res  = await fetch(`/api/subvenciones?${params}`);
    const json = await res.json();
    setRows(prev => {
      const merged = replace ? (json.data ?? []) : [...prev, ...(json.data ?? [])];
      const seen = new Set<number>();
      return merged.filter((r: { id: number }) => seen.has(r.id) ? false : (seen.add(r.id), true));
    });
    setCursor(json.nextCursor ?? null);
    setLoading(false);
  }, []);

  function applyFilter(patch: Partial<Filters>) {
    const next = { ...activeFilters.current, ...patch };
    activeFilters.current = next;
    setFilters(next);
    startTransition(() => {
      const p = new URLSearchParams();
      if (next.q)      p.set("q", next.q);
      if (next.nivel1) p.set("nivel1", next.nivel1);
      if (next.anio)   p.set("anio", next.anio);
      router.replace(`?${p.toString()}`, { scroll: false });
    });
    fetchPage(next, 0, true);
  }

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && cursor !== null && !loading) {
          fetchPage(activeFilters.current, cursor, false);
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [cursor, loading, fetchPage]);

  function handleSearch(val: string) {
    setFilters(f => ({ ...f, q: val }));
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => applyFilter({ q: val }), 350);
  }

  const activeCount = [filters.nivel1, filters.anio].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <Input
          placeholder="Buscar beneficiario o convocatoria…"
          value={filters.q}
          onChange={e => handleSearch(e.target.value)}
          className="max-w-xs"
        />

        {/* Nivel1 */}
        <Select
          value={filters.nivel1 || undefined}
          onValueChange={val => applyFilter({ nivel1: val ?? "" })}
        >
          <SelectTrigger className={`w-40 ${filters.nivel1 ? "border-primary text-primary" : ""}`}>
            <SelectValue placeholder="Ámbito" />
          </SelectTrigger>
          <SelectContent>
            {filters.nivel1 && <SelectItem value="">Todos</SelectItem>}
            {NIVEL1_OPTIONS.map(n => (
              <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Año */}
        <Select
          value={filters.anio || undefined}
          onValueChange={val => applyFilter({ anio: val ?? "" })}
        >
          <SelectTrigger className={`w-28 ${filters.anio ? "border-primary text-primary" : ""}`}>
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            {filters.anio && <SelectItem value="">Todos</SelectItem>}
            {ANIOS.map(a => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeCount > 0 && (
          <button
            onClick={() => applyFilter({ nivel1: "", anio: "" })}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Limpiar ({activeCount})
          </button>
        )}

        <span className="text-xs text-muted-foreground tabnum ml-auto" style={{ fontFamily: "var(--font-mono)" }}>
          {rows.length.toLocaleString("es-ES")} cargados
          {cursor !== null && !loading && " · scroll para más"}
        </span>
      </div>

      {/* Cards mobile */}
      <div className="md:hidden flex flex-col gap-2">
        {rows.length === 0 && !loading && (
          <p className="text-center py-12 text-muted-foreground text-sm">Sin resultados</p>
        )}
        {rows.map(s => <SubvencionCard key={s.id} s={s} />)}
      </div>

      {/* Tabla desktop */}
      <div className="hidden md:block rounded-xl border border-border overflow-x-auto">
        <Table className="table-fixed w-full">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[30%]" />
            <col className="w-[12%]" />
            <col className="w-[13%]" />
            <col className="w-[10%]" />
            <col className="w-[7%]" />
          </colgroup>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Beneficiario</TableHead>
              <TableHead>Convocatoria</TableHead>
              <TableHead className="text-right whitespace-nowrap">Importe</TableHead>
              <TableHead>Instrumento</TableHead>
              <TableHead>Ámbito</TableHead>
              <TableHead className="whitespace-nowrap">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                  Sin resultados
                </TableCell>
              </TableRow>
            )}
            {rows.map(s => {
              const nivel1 = NIVEL1_META[s.nivel1 ?? ""] ?? { label: s.nivel1 ?? "", color: "bg-muted text-muted-foreground" };
              return (
                <TableRow key={s.id} className="border-border hover:bg-muted/30 transition-colors">
                  <TableCell className="py-3">
                    <span className="line-clamp-2 text-sm font-medium">
                      {s.beneficiario ?? "—"}
                    </span>
                    {s.cod_concesion && (
                      <span className="text-xs text-muted-foreground block mt-0.5 tabnum"
                            style={{ fontFamily: "var(--font-mono)" }}>
                        {s.cod_concesion}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 overflow-hidden">
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {s.convocatoria ?? "—"}
                    </span>
                    {s.nivel3 && (
                      <span className="line-clamp-1 text-xs text-muted-foreground/60 mt-0.5 block">
                        {s.nivel3}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-3">
                    <span className="tabnum text-sm font-medium" style={{ fontFamily: "var(--font-mono)" }}>
                      {fmtEuros(s.importe)}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 overflow-hidden">
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {s.instrumento ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    {s.nivel1 && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${nivel1.color}`}>
                        {nivel1.label}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-3 tabnum"
                             style={{ fontFamily: "var(--font-mono)" }}>
                    {fmtDate(s.fecha_concesion)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Sentinel */}
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
