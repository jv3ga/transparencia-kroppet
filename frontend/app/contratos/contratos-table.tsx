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
import { TIPOS_CONTRATO, ANIOS } from "@/lib/constants";
import { ContratoCard } from "./contrato-card";

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

type Organo = { id: number; nombre: string };

type Filters = {
  q: string;
  estado: string;
  organo_id: string;
  tipo: string;
  anio: string;
};

type Props = {
  initialData: Contrato[];
  initialCursor: number;
  initialQ: string;
  initialEstado: string;
  initialEmpresaId?: string;
  initialOrganoId?: string;
};

export default function ContratosTable({ initialData, initialCursor, initialQ, initialEstado, initialEmpresaId = "", initialOrganoId = "" }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [rows, setRows]           = useState<Contrato[]>(initialData);
  const [cursor, setCursor]       = useState<number | null>(initialCursor);
  const [loading, setLoading]     = useState(false);
  const [organos, setOrganos]     = useState<Organo[]>([]);
  const [organoSearch, setOrganoSearch] = useState("");

  const [filters, setFilters] = useState<Filters>({
    q:         initialQ,
    estado:    initialEstado || "",
    organo_id: "",
    tipo:      "",
    anio:      "",
  });

  // empresa_id y organo_id vienen de la URL — se aplican silenciosamente
  const fixedEmpresaId = useRef(initialEmpresaId);
  const fixedOrganoId  = useRef(initialOrganoId);

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const sentinelRef   = useRef<HTMLDivElement>(null);
  const activeFilters = useRef<Filters>(filters);

  useEffect(() => {
    fetch("/api/organos").then(r => r.json()).then(setOrganos).catch(() => {});
  }, []);

  const fetchPage = useCallback(async (f: Filters, cur: number, replace: boolean) => {
    setLoading(true);
    const params = new URLSearchParams({ cursor: String(cur) });
    if (f.q)                        params.set("q", f.q);
    if (f.estado)                   params.set("estado", f.estado);
    if (f.organo_id)                params.set("organo_id", f.organo_id);
    if (f.tipo)                     params.set("tipo", f.tipo);
    if (f.anio)                     params.set("anio", f.anio);
    if (fixedEmpresaId.current) params.set("empresa_id", fixedEmpresaId.current);
    if (fixedOrganoId.current)  params.set("organo_id",  fixedOrganoId.current);

    const res  = await fetch(`/api/contratos?${params}`);
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
      if (next.estado) p.set("estado", next.estado);
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

  const activeCount = [filters.estado, filters.organo_id, filters.tipo, filters.anio].filter(Boolean).length;
  const organosFiltrados = organos.filter(o =>
    o.nombre.toLowerCase().includes(organoSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <Input
          placeholder="Buscar por objeto…"
          value={filters.q}
          onChange={e => handleSearch(e.target.value)}
          className="max-w-xs"
        />

        {/* Órgano */}
        <Select
          value={filters.organo_id || undefined}
          onValueChange={val => applyFilter({ organo_id: val ?? "" })}
        >
          <SelectTrigger className={`w-52 ${filters.organo_id ? "border-primary text-primary" : ""}`}>
            <SelectValue placeholder="Órgano contratante" />
          </SelectTrigger>
          <SelectContent>
            <div className="p-2">
              <Input
                placeholder="Buscar órgano…"
                value={organoSearch}
                onChange={e => setOrganoSearch(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            {filters.organo_id && (
              <SelectItem value="">Todos los órganos</SelectItem>
            )}
            {organosFiltrados.slice(0, 100).map(o => (
              <SelectItem key={o.id} value={String(o.id)}>{o.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tipo */}
        <Select
          value={filters.tipo || undefined}
          onValueChange={val => applyFilter({ tipo: val ?? "" })}
        >
          <SelectTrigger className={`w-44 ${filters.tipo ? "border-primary text-primary" : ""}`}>
            <SelectValue placeholder="Tipo contrato" />
          </SelectTrigger>
          <SelectContent>
            {filters.tipo && <SelectItem value="">Todos los tipos</SelectItem>}
            {Object.entries(TIPOS_CONTRATO).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
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

        {/* Estado */}
        <Select
          value={filters.estado || undefined}
          onValueChange={val => applyFilter({ estado: val ?? "" })}
        >
          <SelectTrigger className={`w-44 ${filters.estado ? "border-primary text-primary" : ""}`}>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {filters.estado && <SelectItem value="">Todos los estados</SelectItem>}
            {Object.entries(ESTADO_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeCount > 0 && (
          <button
            onClick={() => applyFilter({ estado: "", organo_id: "", tipo: "", anio: "" })}
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
        {rows.map(c => <ContratoCard key={c.id} c={c} />)}
      </div>

      {/* Tabla desktop */}
      <div className="hidden md:block rounded-xl border border-border overflow-x-auto">
        <Table className="table-fixed w-full">
          <colgroup>
            <col className="w-[35%]" />
            <col className="w-[20%]" />
            <col className="w-[20%]" />
            <col className="w-[10%]" />
            <col className="w-[8%]" />
            <col className="w-[7%]" />
          </colgroup>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Objeto</TableHead>
              <TableHead>Órgano</TableHead>
              <TableHead>Empresa</TableHead>
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
                  <TableCell className="text-xs text-muted-foreground py-3 overflow-hidden">
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
