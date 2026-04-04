"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { useTheme } from "next-themes";
import { TIPOS_CONTRATO } from "@/lib/constants";

type EmpresaRow = { nombre: string; num_contratos: number; total_importe: number };
type TipoRow    = { tipo_contrato: string; num_contratos: number; total_importe: number };

function fmtM(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M€`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} k€`;
  return `${n} €`;
}

function truncate(s: string, max = 18) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// Amber palette steps
const PIE_COLORS = ["#f59e0b", "#fbbf24", "#fcd34d", "#fde68a", "#fef3c7", "#d97706", "#b45309"];

export function ChartsSection() {
  const [empresas, setEmpresas] = useState<EmpresaRow[]>([]);
  const [tipos, setTipos]       = useState<TipoRow[]>([]);
  const { resolvedTheme }       = useTheme();
  const isDark = resolvedTheme === "dark";

  const mutedColor  = isDark ? "#71717a" : "#a1a1aa";
  const textColor   = isDark ? "#e4e4e7" : "#18181b";
  const gridColor   = isDark ? "#27272a" : "#e4e4e7";

  useEffect(() => {
    fetch("/api/charts")
      .then(r => r.json())
      .then(d => {
        setEmpresas(d.topEmpresas ?? []);
        setTipos(d.porTipo ?? []);
      })
      .catch(() => {});
  }, []);

  const barData = empresas.map(e => ({
    name: truncate(e.nombre),
    importe: Math.round(e.total_importe),
    contratos: e.num_contratos,
  }));

  const pieData = tipos.map(t => ({
    name: TIPOS_CONTRATO[t.tipo_contrato] ?? t.tipo_contrato,
    value: Math.round(t.total_importe),
  }));

  if (empresas.length === 0 && tipos.length === 0) {
    return (
      <div className="grid sm:grid-cols-2 gap-6">
        {[0, 1].map(i => (
          <div key={i} className="rounded-xl border border-border bg-card h-64 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-6">
      {/* Top empresas */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground leading-tight"
              style={{ fontFamily: "var(--font-display)" }}>
            Top empresas adjudicatarias
          </h3>
          <Link href="/empresas"
                className="shrink-0 text-[11px] text-primary hover:underline underline-offset-2">
            Ver todas →
          </Link>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 44, top: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category" dataKey="name" width={108}
              tick={{ fontSize: 10, fill: mutedColor }}
              axisLine={false} tickLine={false}
            />
            <Tooltip
              cursor={{ fill: gridColor }}
              contentStyle={{
                backgroundColor: isDark ? "#18181b" : "#fff",
                border: `1px solid ${gridColor}`,
                borderRadius: 8,
                fontSize: 12,
                color: textColor,
              }}
              formatter={(v) => [fmtM(Number(v)), "Importe"]}
            />
            <Bar dataKey="importe" fill="#f59e0b" radius={[0, 4, 4, 0]}
                 label={{ position: "right", formatter: (n: unknown) => fmtM(Number(n)), fontSize: 10, fill: mutedColor }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Por tipo de contrato */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            style={{ fontFamily: "var(--font-display)" }}>
          Por tipo de contrato
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%" cy="50%"
              innerRadius={52} outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#18181b" : "#fff",
                border: `1px solid ${gridColor}`,
                borderRadius: 8,
                fontSize: 12,
                color: textColor,
              }}
              formatter={(v, _name, item) => [fmtM(Number(v)), (item as { name?: string }).name ?? ""]}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Leyenda manual fuera del SVG */}
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
          {pieData.map((entry, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className="text-[11px]" style={{ color: mutedColor }}>{entry.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
