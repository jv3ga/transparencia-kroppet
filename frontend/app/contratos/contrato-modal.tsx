"use client";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { Contrato } from "@/lib/supabase";
import { TIPOS_CONTRATO, PROCEDIMIENTOS } from "@/lib/constants";
import { ExternalLink } from "lucide-react";

const ESTADO_LABEL: Record<string, { label: string; color: string }> = {
  PUB: { label: "Publicado",     color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  ADJ: { label: "Adjudicado",    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  RES: { label: "Resuelto",      color: "bg-muted text-muted-foreground" },
  EV:  { label: "En evaluación", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  LIC: { label: "Licitación",    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
};

function fmtEuros(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value || value === "—") return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

type Props = {
  contrato: Contrato | null;
  onClose: () => void;
};

export function ContratoModal({ contrato, onClose }: Props) {
  const est = contrato ? (ESTADO_LABEL[contrato.estado ?? ""] ?? { label: contrato.estado ?? "—", color: "bg-muted text-muted-foreground" }) : null;

  return (
    <Dialog open={!!contrato} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {contrato && (
          <>
            <DialogHeader>
              <div className="flex items-start gap-3 pr-6">
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-base font-semibold leading-snug">
                    {contrato.objeto}
                  </DialogTitle>
                  {contrato.expediente && (
                    <p className="text-xs text-muted-foreground tabnum mt-1"
                       style={{ fontFamily: "var(--font-mono)" }}>
                      {contrato.expediente}
                    </p>
                  )}
                </div>
                {est && (
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${est.color}`}>
                    {est.label}
                  </span>
                )}
              </div>
            </DialogHeader>

            {/* Importes destacados */}
            <div className="flex gap-3 flex-wrap py-1">
              <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Sin IVA</span>
                <span className="tabnum text-lg font-bold text-primary" style={{ fontFamily: "var(--font-mono)" }}>
                  {fmtEuros(contrato.importe_sin_iva)}
                </span>
              </div>
              {contrato.importe_con_iva && (
                <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Con IVA</span>
                  <span className="tabnum text-lg font-bold" style={{ fontFamily: "var(--font-mono)" }}>
                    {fmtEuros(contrato.importe_con_iva)}
                  </span>
                </div>
              )}
            </div>

            {/* Campos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <Field label="Empresa adjudicataria" value={
                contrato.empresas ? (
                  <span>
                    {contrato.empresas.nombre}
                    {contrato.empresas.nif && (
                      <span className="block text-xs text-muted-foreground tabnum mt-0.5"
                            style={{ fontFamily: "var(--font-mono)" }}>
                        {contrato.empresas.nif}
                      </span>
                    )}
                  </span>
                ) : "—"
              } />
              <Field label="Órgano contratante" value={contrato.organos?.nombre} />
              <Field label="Tipo de contrato" value={TIPOS_CONTRATO[contrato.tipo_contrato ?? ""] ?? contrato.tipo_contrato} />
              <Field label="Procedimiento" value={PROCEDIMIENTOS[contrato.procedimiento ?? ""] ?? contrato.procedimiento} />
              <Field label="Fecha de publicación" value={fmtDate(contrato.fecha_publicacion)} />
              <Field label="Fecha de adjudicación" value={fmtDate(contrato.fecha_adjudicacion)} />
            </div>

            {/* Enlace fuente */}
            {contrato.url_fuente && (
              <div className="pt-2 border-t border-border">
                <a href={contrato.url_fuente} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline underline-offset-2">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ver en Plataforma de Contratación del Estado
                </a>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
