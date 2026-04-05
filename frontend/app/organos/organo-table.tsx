"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { RankingCard } from "@/components/ui/ranking-card";

type OrganoRow = {
  id: string;
  nombre: string;
  codigo: string | null;
  num_contratos: number;
  total_importe: number;
};

function fmtEuros(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

type Props = {
  initialData: OrganoRow[];
  initialCursor: number;
  initialQ: string;
};

type Sort = { col: "total_importe" | "num_contratos"; dir: "asc" | "desc" };

export default function OrganoTable({ initialData, initialCursor, initialQ }: Props) {
  const [rows, setRows]       = useState<OrganoRow[]>(initialData);
  const [cursor, setCursor]   = useState<number | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [q, setQ]             = useState(initialQ);
  const [sort, setSort]       = useState<Sort>({ col: "total_importe", dir: "desc" });
  const activeSort            = useRef<Sort>(sort);
  const sentinelRef           = useRef<HTMLDivElement>(null);
  const searchTimeout         = useRef<ReturnType<typeof setTimeout>>(null);
  const activeQ               = useRef(initialQ);

  const fetchPage = useCallback(async (search: string, cur: number, replace: boolean) => {
    setLoading(true);
    const params = new URLSearchParams({ cursor: String(cur) });
    if (search) params.set("q", search);
    params.set("sort_col", activeSort.current.col);
    params.set("sort_dir", activeSort.current.dir);
    const res  = await fetch(`/api/organos-ranking?${params}`);
    const json = await res.json();
    setRows(prev => {
      const merged = replace ? (json.data ?? []) : [...prev, ...(json.data ?? [])];
      const seen = new Set<string>();
      return merged.filter((r: OrganoRow) => seen.has(r.id) ? false : (seen.add(r.id), true));
    });
    setCursor(json.nextCursor ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && cursor !== null && !loading) {
          fetchPage(activeQ.current, cursor, false);
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [cursor, loading, fetchPage]);

  function handleSort(col: Sort["col"]) {
    const next: Sort = {
      col,
      dir: activeSort.current.col === col && activeSort.current.dir === "desc" ? "asc" : "desc",
    };
    activeSort.current = next;
    setSort(next);
    fetchPage(activeQ.current, 0, true);
  }

  function handleSearch(val: string) {
    setQ(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      activeQ.current = val;
      fetchPage(val, 0, true);
    }, 350);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <Input
          placeholder="Buscar órgano…"
          value={q}
          onChange={e => handleSearch(e.target.value)}
          className="max-w-xs"
        />
        <span className="text-xs text-muted-foreground tabnum ml-auto" style={{ fontFamily: "var(--font-mono)" }}>
          {rows.length.toLocaleString("es-ES")} órganos
          {cursor !== null && !loading && " · scroll para más"}
        </span>
      </div>

      {/* Cards mobile */}
      <div className="md:hidden flex flex-col gap-2">
        {rows.length === 0 && !loading && (
          <p className="text-center py-12 text-muted-foreground text-sm">Sin resultados</p>
        )}
        {rows.map((o, i) => (
          <RankingCard key={o.id} rank={i + 1} nombre={o.nombre} subtitulo={o.codigo}
                       href={`/organos/${o.id}`}
                       numContratos={o.num_contratos} totalImporte={o.total_importe} />
        ))}
      </div>

      {/* Tabla desktop */}
      <div className="hidden md:block rounded-xl border border-border overflow-x-auto">
        <Table className="table-fixed w-full">
          <colgroup>
            <col className="w-[5%]" />
            <col className="w-[55%]" />
            <col className="w-[15%]" />
            <col className="w-[25%]" />
          </colgroup>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-right">#</TableHead>
              <TableHead>Órgano</TableHead>
              <TableHead className="text-right">
                <button onClick={() => handleSort("num_contratos")}
                        className="inline-flex items-center gap-1 ml-auto hover:text-foreground transition-colors">
                  Contratos
                  {sort.col === "num_contratos"
                    ? sort.dir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
                    : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button onClick={() => handleSort("total_importe")}
                        className="inline-flex items-center gap-1 ml-auto hover:text-foreground transition-colors">
                  Importe total
                  {sort.col === "total_importe"
                    ? sort.dir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
                    : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground text-sm">
                  Sin resultados
                </TableCell>
              </TableRow>
            )}
            {rows.map((o, i) => (
              <TableRow key={o.id} className="border-border hover:bg-muted/30 transition-colors">
                <TableCell className="text-right text-xs text-muted-foreground tabnum py-3" style={{ fontFamily: "var(--font-mono)" }}>
                  {i + 1}
                </TableCell>
                <TableCell className="py-3 overflow-hidden">
                  <Link
                    href={`/organos/${o.id}`}
                    className="font-medium text-sm hover:text-primary transition-colors line-clamp-2"
                  >
                    {o.nombre}
                  </Link>
                  {o.codigo && (
                    <span className="text-xs text-muted-foreground block tabnum mt-0.5" style={{ fontFamily: "var(--font-mono)" }}>
                      {o.codigo}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right tabnum text-sm py-3" style={{ fontFamily: "var(--font-mono)" }}>
                  {o.num_contratos.toLocaleString("es-ES")}
                </TableCell>
                <TableCell className="text-right tabnum text-sm font-medium py-3" style={{ fontFamily: "var(--font-mono)" }}>
                  {fmtEuros(o.total_importe)}
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
