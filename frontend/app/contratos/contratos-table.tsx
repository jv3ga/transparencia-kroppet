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
import type { Contrato } from "@/lib/supabase";
import { TIPOS_CONTRATO, ANIOS } from "@/lib/constants";
import { ContratoCard } from "./contrato-card";
import { ContratoModal } from "./contrato-modal";

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

type Organo   = { id: string; nombre: string };
type Empresa  = { id: string; nombre: string; nif: string };

type Sort = { col: "fecha_publicacion" | "importe_sin_iva"; dir: "asc" | "desc" };

type Filters = {
  q: string;
  estado: string;
  organo_id: string;
  empresa_id: string;
  tipo: string;
  anio: string;
};

type Props = {
  initialData: Contrato[];
  initialCursor: number;
  initialQ: string;
  initialEstado: string;
  initialTipo?: string;
  initialAnio?: string;
  initialEmpresaId?: string;       // contexto fijo (perfil empresa) — oculto
  initialFilterEmpresaId?: string; // filtro interactivo desde URL
  initialOrganoId?: string;
  initialOrganoNombre?: string;
};

export default function ContratosTable({ initialData, initialCursor, initialQ, initialEstado, initialTipo = "", initialAnio = "", initialEmpresaId = "", initialFilterEmpresaId = "", initialOrganoId = "", initialOrganoNombre }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [rows, setRows]               = useState<Contrato[]>(initialData);
  const [cursor, setCursor]           = useState<number | null>(initialCursor);
  const [loading, setLoading]         = useState(false);
  const [organos, setOrganos]         = useState<Organo[]>(
    initialOrganoId && initialOrganoNombre
      ? [{ id: initialOrganoId, nombre: initialOrganoNombre }]
      : []
  );
  const [organoSearch, setOrganoSearch]     = useState("");
  const organoSearchTimeout                 = useRef<ReturnType<typeof setTimeout>>(null);
  const [empresas, setEmpresas]             = useState<Empresa[]>([]);
  const [empresaSearch, setEmpresaSearch]   = useState("");
  const empresaSearchTimeout                = useRef<ReturnType<typeof setTimeout>>(null);
  const [selected, setSelected]       = useState<Contrato | null>(null);

  const [filters, setFilters] = useState<Filters>({
    q:          initialQ,
    estado:     initialEstado || "",
    organo_id:  initialOrganoId || "",
    empresa_id: initialFilterEmpresaId || "",
    tipo:       initialTipo || "",
    anio:       initialAnio || "",
  });

  // empresa_id y organo_id vienen de la URL — se aplican silenciosamente
  const fixedEmpresaId = useRef(initialEmpresaId);
  const fixedOrganoId  = useRef(initialOrganoId);

  const [sort, setSort] = useState<Sort>({ col: "fecha_publicacion", dir: "desc" });
  const activeSort    = useRef<Sort>(sort);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const sentinelRef   = useRef<HTMLDivElement>(null);
  const activeFilters = useRef<Filters>(filters);

  // Carga inicial: top 50 por nombre para el placeholder, o el organo fijo si viene de perfil
  useEffect(() => {
    if (initialOrganoId && initialOrganoNombre) return; // ya pre-seeded
    fetch("/api/organos").then(r => r.json()).then(setOrganos).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleEmpresaSearch(val: string) {
    setEmpresaSearch(val);
    if (empresaSearchTimeout.current) clearTimeout(empresaSearchTimeout.current);
    empresaSearchTimeout.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (val) params.set("q", val);
      fetch(`/api/empresas?${params}`)
        .then(r => r.json())
        .then(d => setEmpresas(d.data ?? []))
        .catch(() => {});
    }, 300);
  }

  function handleOrganoSearch(val: string) {
    setOrganoSearch(val);
    if (organoSearchTimeout.current) clearTimeout(organoSearchTimeout.current);
    organoSearchTimeout.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (val) params.set("q", val);
      fetch(`/api/organos?${params}`).then(r => r.json()).then(setOrganos).catch(() => {});
    }, 300);
  }

  const fetchPage = useCallback(async (f: Filters, cur: number, replace: boolean) => {
    setLoading(true);
    const params = new URLSearchParams({ cursor: String(cur) });
    if (f.q)                        params.set("q", f.q);
    if (f.estado)                   params.set("estado", f.estado);
    if (f.organo_id)                params.set("organo_id", f.organo_id);
    if (f.tipo)                     params.set("tipo", f.tipo);
    if (f.anio)                     params.set("anio", f.anio);
    const effectiveEmpresaId = fixedEmpresaId.current || f.empresa_id;
    if (effectiveEmpresaId)     params.set("empresa_id", effectiveEmpresaId);
    if (fixedOrganoId.current)  params.set("organo_id",  fixedOrganoId.current);
    params.set("sort_col", activeSort.current.col);
    params.set("sort_dir", activeSort.current.dir);

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
      if (next.q)          p.set("q",          next.q);
      if (next.estado)     p.set("estado",     next.estado);
      if (next.organo_id)  p.set("organo_id",  next.organo_id);
      if (next.empresa_id) p.set("empresa_id", next.empresa_id);
      if (next.tipo)       p.set("tipo",       next.tipo);
      if (next.anio)       p.set("anio",       next.anio);
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

  function handleSort(col: Sort["col"]) {
    const next: Sort = {
      col,
      dir: activeSort.current.col === col && activeSort.current.dir === "desc" ? "asc" : "desc",
    };
    activeSort.current = next;
    setSort(next);
    fetchPage(activeFilters.current, 0, true);
  }

  function handleSearch(val: string) {
    setFilters(f => ({ ...f, q: val }));
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => applyFilter({ q: val }), 350);
  }

  const activeCount = [filters.estado, filters.organo_id, filters.empresa_id, filters.tipo, filters.anio].filter(Boolean).length;

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
          value={filters.organo_id}
          onValueChange={val => applyFilter({ organo_id: val ?? "" })}
        >
          <SelectTrigger className={`w-52 ${filters.organo_id ? "border-primary text-primary" : ""}`}>
            <SelectValue placeholder="Órgano contratante">
              {filters.organo_id
                ? (organos.find(o => o.id === filters.organo_id)?.nombre ?? filters.organo_id)
                : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <div className="p-2">
              <Input
                placeholder="Buscar órgano…"
                value={organoSearch}
                onChange={e => handleOrganoSearch(e.target.value)}
                onKeyDown={e => e.stopPropagation()}
                className="h-8 text-sm"
              />
            </div>
            {filters.organo_id && (
              <SelectItem value="">Todos los órganos</SelectItem>
            )}
            {organos.map(o => (
              <SelectItem key={o.id} value={String(o.id)}>{o.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Empresa (solo en contratos page, no en perfil) */}
        {!fixedEmpresaId.current && (
          <Select
            value={filters.empresa_id}
            onValueChange={val => applyFilter({ empresa_id: val ?? "" })}
          >
            <SelectTrigger className={`w-52 ${filters.empresa_id ? "border-primary text-primary" : ""}`}>
              <SelectValue placeholder="Empresa adjudicataria">
                {filters.empresa_id
                  ? (empresas.find(e => String(e.id) === filters.empresa_id)?.nombre ?? filters.empresa_id)
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <div className="p-2">
                <Input
                  placeholder="Buscar empresa o CIF…"
                  value={empresaSearch}
                  onChange={e => handleEmpresaSearch(e.target.value)}
                  onKeyDown={e => e.stopPropagation()}
                  className="h-8 text-sm"
                />
              </div>
              {filters.empresa_id && (
                <SelectItem value="">Todas las empresas</SelectItem>
              )}
              {empresas.map(e => (
                <SelectItem key={e.id} value={String(e.id)}>
                  {e.nombre}
                  {e.nif && (
                    <span className="text-muted-foreground text-xs ml-1.5 tabnum">{e.nif}</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Tipo */}
        <Select
          value={filters.tipo}
          onValueChange={val => applyFilter({ tipo: val ?? "" })}
        >
          <SelectTrigger className={`w-44 ${filters.tipo ? "border-primary text-primary" : ""}`}>
            <SelectValue placeholder="Tipo contrato">
              {filters.tipo ? (TIPOS_CONTRATO[filters.tipo] ?? filters.tipo) : undefined}
            </SelectValue>
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
          value={filters.anio}
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
          value={filters.estado}
          onValueChange={val => applyFilter({ estado: val ?? "" })}
        >
          <SelectTrigger className={`w-44 ${filters.estado ? "border-primary text-primary" : ""}`}>
            <SelectValue placeholder="Estado">
              {filters.estado ? (ESTADO_LABEL[filters.estado]?.label ?? filters.estado) : undefined}
            </SelectValue>
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
            onClick={() => applyFilter({ estado: "", organo_id: "", empresa_id: "", tipo: "", anio: "" })}
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
        {rows.map(c => (
          <button key={c.id} className="w-full text-left" onClick={() => setSelected(c)}>
            <ContratoCard c={c} />
          </button>
        ))}
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
              <TableHead className="text-right whitespace-nowrap">
                <button onClick={() => handleSort("importe_sin_iva")}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors ml-auto">
                  Importe
                  {sort.col === "importe_sin_iva"
                    ? sort.dir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
                    : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                </button>
              </TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="whitespace-nowrap">
                <button onClick={() => handleSort("fecha_publicacion")}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                  Fecha
                  {sort.col === "fecha_publicacion"
                    ? sort.dir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
                    : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                </button>
              </TableHead>
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
                <TableRow key={c.id}
                          onClick={() => setSelected(c)}
                          className="border-border hover:bg-muted/30 transition-colors cursor-pointer">
                  <TableCell className="max-w-xs py-3">
                    {c.url_fuente ? (
                      <a href={c.url_fuente} target="_blank" rel="noopener noreferrer"
                         onClick={e => e.stopPropagation()}
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

      <ContratoModal contrato={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
