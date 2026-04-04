"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
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

type Sueldo = {
  id: number;
  anyo: number;
  alto_cargo: string;
  organismo: string | null;
  ministerio: string | null;
  retribucion: number | null;
};

type Sort = { col: "retribucion" | "anyo"; dir: "asc" | "desc" };
type Filters = { q: string; anyo: string };

function fmtEuros(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(n);
}

/** Elimina sufijos de trienios y anotaciones del nombre del cargo */
function cleanCargo(s: string) {
  return s
    .replace(/\s*\(\*+\)\s*/g, "")
    .replace(/\s+\d+T\s*$/i, "")
    .replace(/\s*\(\d+T\)\s*/gi, "")
    .replace(/\s*\([^)]{1,30}\)\s*$/, "")
    .trim();
}

type Props = {
  initialData: Sueldo[];
  initialCursor: number;
  initialQ: string;
  initialAnio: string;
};

export default function SueldosTable({ initialData, initialCursor, initialQ, initialAnio }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [rows, setRows]       = useState<Sueldo[]>(initialData);
  const [cursor, setCursor]   = useState<number | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [sort, setSort]       = useState<Sort>({ col: "retribucion", dir: "desc" });

  const [filters, setFilters] = useState<Filters>({ q: initialQ, anyo: initialAnio });
  const activeFilters = useRef<Filters>(filters);
  const activeSort    = useRef<Sort>(sort);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const sentinelRef   = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (f: Filters, s: Sort, cur: number, replace: boolean) => {
    setLoading(true);
    const params = new URLSearchParams({ cursor: String(cur), sort_col: s.col, sort_dir: s.dir });
    if (f.q)    params.set("q", f.q);
    if (f.anyo) params.set("anyo", f.anyo);

    const res  = await fetch(`/api/sueldos?${params}`);
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
      if (next.q)    p.set("q", next.q);
      if (next.anyo) p.set("anyo", next.anyo);
      router.replace(`?${p.toString()}`, { scroll: false });
    });
    fetchPage(next, activeSort.current, 0, true);
  }

  function handleSort(col: Sort["col"]) {
    const next: Sort = {
      col,
      dir: activeSort.current.col === col && activeSort.current.dir === "desc" ? "asc" : "desc",
    };
    activeSort.current = next;
    setSort(next);
    fetchPage(activeFilters.current, next, 0, true);
  }

  function SortIcon({ col }: { col: Sort["col"] }) {
    if (sort.col !== col) return <ChevronsUpDown className="h-3 w-3 opacity-40 ml-1 inline" />;
    return sort.dir === "desc"
      ? <ChevronDown className="h-3 w-3 ml-1 inline text-primary" />
      : <ChevronUp   className="h-3 w-3 ml-1 inline text-primary" />;
  }

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && cursor !== null && !loading)
          fetchPage(activeFilters.current, activeSort.current, cursor, false);
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

  const activeCount = [filters.anyo].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <Input
          placeholder="Buscar cargo o ministerio…"
          value={filters.q}
          onChange={e => handleSearch(e.target.value)}
          className="max-w-xs"
        />

        <Select value={filters.anyo} onValueChange={val => applyFilter({ anyo: val })}>
          <SelectTrigger className={`w-28 ${filters.anyo ? "border-primary text-primary" : ""}`}>
            <SelectValue placeholder="Año">
              {filters.anyo || "Año"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {filters.anyo && <SelectItem value="">Todos</SelectItem>}
            {ANIOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>

        {activeCount > 0 && (
          <button
            onClick={() => applyFilter({ anyo: "" })}
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

      {/* Tabla */}
      <div className="rounded-xl border border-border overflow-x-auto">
        <Table className="table-fixed w-full">
          <colgroup>
            <col className="w-[32%]" />
            <col className="w-[28%]" />
            <col className="w-[22%]" />
            <col className="w-[11%]" />
            <col className="w-[7%]" />
          </colgroup>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Cargo</TableHead>
              <TableHead>Organismo</TableHead>
              <TableHead>Ministerio</TableHead>
              <TableHead
                className="text-right cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort("retribucion")}
              >
                Retribución <SortIcon col="retribucion" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort("anyo")}
              >
                Año <SortIcon col="anyo" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                  Sin resultados
                </TableCell>
              </TableRow>
            )}
            {rows.map(s => (
              <TableRow key={s.id} className="border-border hover:bg-muted/30 transition-colors">
                <TableCell className="py-3">
                  <span className="line-clamp-2 text-sm font-medium">
                    {cleanCargo(s.alto_cargo)}
                  </span>
                </TableCell>
                <TableCell className="py-3 overflow-hidden">
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {s.organismo ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="py-3 overflow-hidden">
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {s.ministerio ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="text-right py-3">
                  <span className="tabnum text-sm font-medium" style={{ fontFamily: "var(--font-mono)" }}>
                    {fmtEuros(s.retribucion)}
                  </span>
                </TableCell>
                <TableCell className="py-3 text-xs text-muted-foreground tabnum"
                           style={{ fontFamily: "var(--font-mono)" }}>
                  {s.anyo}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div ref={sentinelRef} className="h-1" />

      {loading && (
        <div className="flex justify-center py-6">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
