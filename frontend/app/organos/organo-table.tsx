"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import Link from "next/link";

type OrganoRow = {
  id: number;
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

export default function OrganoTable({ initialData, initialCursor, initialQ }: Props) {
  const [rows, setRows]       = useState<OrganoRow[]>(initialData);
  const [cursor, setCursor]   = useState<number | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [q, setQ]             = useState(initialQ);
  const sentinelRef           = useRef<HTMLDivElement>(null);
  const searchTimeout         = useRef<ReturnType<typeof setTimeout>>(null);
  const activeQ               = useRef(initialQ);

  const fetchPage = useCallback(async (search: string, cur: number, replace: boolean) => {
    setLoading(true);
    const params = new URLSearchParams({ cursor: String(cur) });
    if (search) params.set("q", search);
    const res  = await fetch(`/api/organos-ranking?${params}`);
    const json = await res.json();
    setRows(prev => {
      const merged = replace ? (json.data ?? []) : [...prev, ...(json.data ?? [])];
      const seen = new Set<number>();
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
          <div key={o.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <span className="text-xs text-muted-foreground tabnum w-6 text-right shrink-0"
                  style={{ fontFamily: "var(--font-mono)" }}>
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <Link href={`/contratos?organo_id=${o.id}`}
                    className="font-medium text-sm hover:text-primary transition-colors line-clamp-2 leading-snug">
                {o.nombre}
              </Link>
              {o.codigo && (
                <span className="text-xs text-muted-foreground block tabnum mt-0.5"
                      style={{ fontFamily: "var(--font-mono)" }}>
                  {o.codigo}
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="tabnum text-sm font-semibold text-primary"
                 style={{ fontFamily: "var(--font-mono)" }}>
                {fmtEuros(o.total_importe)}
              </p>
              <p className="text-[10px] text-muted-foreground tabnum"
                 style={{ fontFamily: "var(--font-mono)" }}>
                {o.num_contratos.toLocaleString("es-ES")} contratos
              </p>
            </div>
          </div>
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
              <TableHead className="text-right">Contratos</TableHead>
              <TableHead className="text-right">Importe total</TableHead>
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
                    href={`/contratos?organo_id=${o.id}`}
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
