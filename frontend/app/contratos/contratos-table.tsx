"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Contrato } from "@/lib/supabase";

const ESTADO_LABEL: Record<string, { label: string; color: string }> = {
  PUB: { label: "Publicado",     color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  ADJ: { label: "Adjudicado",    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  RES: { label: "Resuelto",      color: "bg-muted text-muted-foreground" },
  EV:  { label: "En evaluación", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  LIC: { label: "Licitación",    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
};

function formatEuros(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function ContratosTable({ contratos }: { contratos: Contrato[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [estado, setEstado] = useState(searchParams.get("estado") ?? "todos");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contratos.filter((c) => {
      const matchQ =
        !q ||
        c.objeto.toLowerCase().includes(q) ||
        c.empresas?.nombre.toLowerCase().includes(q) ||
        c.organos?.nombre.toLowerCase().includes(q);
      const matchEstado = estado === "todos" || c.estado === estado;
      return matchQ && matchEstado;
    });
  }, [contratos, search, estado]);

  function handleSearch(val: string) {
    setSearch(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val) params.set("q", val); else params.delete("q");
    router.replace(`?${params.toString()}`);
  }

  function handleEstado(val: string | null) {
    if (!val) return;
    setEstado(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val !== "todos") params.set("estado", val); else params.delete("estado");
    router.replace(`?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Buscar por objeto, empresa u órgano…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
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
        <span className="text-sm text-gray-500 self-center">
          {filtered.length} contratos
        </span>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[300px]">Objeto</TableHead>
              <TableHead>Órgano</TableHead>
              <TableHead>Empresa adjudicataria</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                  Sin resultados
                </TableCell>
              </TableRow>
            )}
            {filtered.map((c) => {
              const est = ESTADO_LABEL[c.estado ?? ""] ?? { label: c.estado ?? "—", color: "bg-gray-100 text-gray-700" };
              return (
                <TableRow key={c.id} className="hover:bg-gray-50">
                  <TableCell className="max-w-xs">
                    {c.url_fuente ? (
                      <a
                        href={c.url_fuente}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline line-clamp-2 text-sm"
                      >
                        {c.objeto}
                      </a>
                    ) : (
                      <span className="line-clamp-2 text-sm">{c.objeto}</span>
                    )}
                    {c.expediente && (
                      <span className="text-xs text-gray-400 block mt-0.5">
                        {c.expediente}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-[180px]">
                    <span className="line-clamp-2">{c.organos?.nombre ?? "—"}</span>
                  </TableCell>
                  <TableCell className="text-sm max-w-[180px]">
                    <span className="line-clamp-2">{c.empresas?.nombre ?? "—"}</span>
                    {c.empresas?.nif && (
                      <span className="text-xs text-gray-400 block">{c.empresas.nif}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                    {formatEuros(c.importe_sin_iva)}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${est.color}`}>
                      {est.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                    {formatDate(c.fecha_adjudicacion ?? c.fecha_publicacion)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
