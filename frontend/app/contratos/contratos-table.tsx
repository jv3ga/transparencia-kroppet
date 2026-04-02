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

type Props = {
  initialData: Contrato[];
  initialCursor: number;
  initialQ: string;
  initialEstado: string;
};

export default function ContratosTable({ initialData, initialCursor, initialQ, initialEstado }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [rows, setRows]           = useState<Contrato[]>(initialData);
  const [cursor, setCursor]       = useState<number | null>(initialCursor);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState(initialQ);
  const [estado, setEstado]       = useState(initialEstado || "todos");
  const searchTimeout             = useRef<ReturnType<typeof setTimeout>>(null);
  const sentinelRef               = useRef<HTMLDivElement>(null);
  // Track current filter to reset on change
  const activeQ      = useRef(initialQ);
  const activeEstado = useRef(initialEstado);

  // Fetch a page from the API
  const fetchPage = useCallback(async (q: string, est: string, cur: number, replace: boolean) => {
    setLoading(true);
    const params = new URLSearchParams({ cursor: String(cur) });
    if (q)                  params.set("q", q);
    if (est && est !== "todos") params.set("estado", est);

    const res  = await fetch(`/api/contratos?${params}`);
    const json = await res.json();
    setRows(prev => replace ? json.data : [...prev, ...json.data]);
    setCursor(json.nextCursor);
    setLoading(false);
  }, []);

  // Intersection observer → load next page
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && cursor !== null && !loading) {
          fetchPage(activeQ.current, activeEstado.current, cursor, false);
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [cursor, loading, fetchPage]);

  // Search with debounce
  function handleSearch(val: string) {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      activeQ.current = val;
      startTransition(() => {
        const p = new URLSearchParams();
        if (val) p.set("q", val);
        if (activeEstado.current && activeEstado.current !== "todos") p.set("estado", activeEstado.current);
        router.replace(`?${p.toString()}`, { scroll: false });
      });
      fetchPage(val, activeEstado.current, 0, true);
    }, 350);
  }

  function handleEstado(val: string | null) {
    if (!val) return;
    setEstado(val);
    activeEstado.current = val;
    startTransition(() => {
      const p = new URLSearchParams();
      if (activeQ.current) p.set("q", activeQ.current);
      if (val && val !== "todos") p.set("estado", val);
      router.replace(`?${p.toString()}`, { scroll: false });
    });
    fetchPage(activeQ.current, val, 0, true);
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <Input
          placeholder="Buscar por objeto, empresa u órgano…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={estado} onValueChange={handleEstado}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {Object.entries(ESTADO_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground tabnum" style={{ fontFamily: "var(--font-mono)" }}>
          {rows.length.toLocaleString("es-ES")} cargados
          {cursor !== null && !loading && " · scroll para más"}
        </span>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="min-w-[300px]">Objeto</TableHead>
              <TableHead className="min-w-[160px]">Órgano</TableHead>
              <TableHead className="min-w-[160px]">Empresa</TableHead>
              <TableHead className="text-right whitespace-nowrap">Importe</TableHead>
              <TableHead>Estado</TableHead>
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
            {rows.map(c => {
              const est = ESTADO_LABEL[c.estado ?? ""] ?? { label: c.estado ?? "—", color: "bg-muted text-muted-foreground" };
              return (
                <TableRow key={c.id} className="border-border hover:bg-muted/30 transition-colors">
                  <TableCell className="max-w-xs py-3">
                    {c.url_fuente ? (
                      <a href={c.url_fuente} target="_blank" rel="noopener noreferrer"
                         className="text-primary hover:underline underline-offset-2 line-clamp-2 text-sm">
                        {c.objeto}
                      </a>
                    ) : (
                      <span className="line-clamp-2 text-sm">{c.objeto}</span>
                    )}
                    {c.expediente && (
                      <span className="text-xs text-muted-foreground block mt-0.5 tabnum"
                            style={{ fontFamily: "var(--font-mono)" }}>
                        {c.expediente}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[180px] py-3">
                    <span className="line-clamp-2">{c.organos?.nombre ?? "—"}</span>
                  </TableCell>
                  <TableCell className="text-xs max-w-[180px] py-3">
                    <span className="line-clamp-2">{c.empresas?.nombre ?? "—"}</span>
                    {c.empresas?.nif && (
                      <span className="text-muted-foreground block tabnum"
                            style={{ fontFamily: "var(--font-mono)" }}>
                        {c.empresas.nif}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-3">
                    <span className="tabnum text-sm font-medium" style={{ fontFamily: "var(--font-mono)" }}>
                      {fmtEuros(c.importe_sin_iva)}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${est.color}`}>
                      {est.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-3 tabnum"
                             style={{ fontFamily: "var(--font-mono)" }}>
                    {fmtDate(c.fecha_adjudicacion ?? c.fecha_publicacion)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Sentinel para IntersectionObserver */}
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
