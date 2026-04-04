"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { useTheme } from "next-themes";
import { TIPOS_CONTRATO } from "@/lib/constants";

type BarRow = { id: number; nombre: string; num_contratos: number; total_importe: number };
type TipoRow = { tipo_contrato: string; num_contratos: number; total_importe: number };

const PIE_COLORS = ["#f59e0b", "#fbbf24", "#fcd34d", "#fde68a", "#d97706", "#b45309"];

function fmtM(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M€`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} k€`;
  return `${n} €`;
}

function truncate(s: string, max = 22) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

type Props = {
  entityId: number;
  type: "empresa" | "organo";
  barLabel: string; // "Órganos contratantes" | "Empresas adjudicatarias"
};

export function ProfileCharts({ entityId, type, barLabel }: Props) {
  const [barData, setBarData]   = useState<BarRow[]>([]);
  const [pieData, setPieData]   = useState<TipoRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const { resolvedTheme }       = useTheme();
  const router                  = useRouter();
  // empresa profile → bars are organos; organo profile → bars are empresas
  const barHref = (id: number) => type === "empresa" ? `/organos/${id}` : `/empresas/${id}`;
  const isDark = resolvedTheme === "dark";

  const mutedColor = isDark ? "#71717a" : "#a1a1aa";
  const textColor  = isDark ? "#e4e4e7" : "#18181b";
  const gridColor  = isDark ? "#27272a" : "#e4e4e7";

  useEffect(() => {
    const url = type === "empresa"
      ? `/api/empresas/${entityId}/charts`
      : `/api/organos/${entityId}/charts`;

    fetch(url)
      .then(r => r.json())
      .then(d => {
        setBarData(type === "empresa" ? (d.top_organos ?? []) : (d.top_empresas ?? []));
        setPieData(d.por_tipo ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [entityId, type]);

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 gap-6">
        {[0, 1].map(i => (
          <div key={i} className="rounded-xl border border-border bg-card h-52 animate-pulse" />
        ))}
      </div>
    );
  }

  if (barData.length === 0 && pieData.length === 0) return null;

  const bars = barData.map(r => ({
    id: r.id,
    name: truncate(r.nombre),
    importe: Math.round(r.total_importe),
  }));

  const pie = pieData.map(t => ({
    name: TIPOS_CONTRATO[t.tipo_contrato] ?? t.tipo_contrato,
    value: Math.round(t.total_importe),
  }));

  const tooltipStyle = {
    backgroundColor: isDark ? "#18181b" : "#fff",
    border: `1px solid ${gridColor}`,
    borderRadius: 8,
    fontSize: 12,
    color: textColor,
  };

  return (
    <div className="grid sm:grid-cols-2 gap-6">
      {/* Bar chart */}
      {bars.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              style={{ fontFamily: "var(--font-display)" }}>
            {barLabel}
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(60, bars.length * 36)}>
            <BarChart data={bars} layout="vertical" margin={{ left: 4, right: 44, top: 4, bottom: 4 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={108}
                     tick={{ fontSize: 10, fill: mutedColor }}
                     axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: gridColor }} contentStyle={tooltipStyle}
                       formatter={(v) => [fmtM(Number(v)), "Importe"]} />
              <Bar dataKey="importe" fill="#f59e0b" radius={[0, 4, 4, 0]}
                   barSize={20} cursor="pointer"
                   onClick={(d) => { const id = (d as unknown as { id?: number }).id; if (id) router.push(barHref(id)); }}
                   label={{ position: "right", formatter: (n: unknown) => fmtM(Number(n)), fontSize: 10, fill: mutedColor }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Donut chart */}
      {pie.length > 1 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              style={{ fontFamily: "var(--font-display)" }}>
            Por tipo de contrato
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pie} cx="50%" cy="50%"
                   innerRadius={45} outerRadius={70}
                   paddingAngle={2} dataKey="value">
                {pie.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle}
                       formatter={(v, _n, item) => [fmtM(Number(v)), (item as { name?: string }).name ?? ""]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
            {pie.map((entry, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-[11px]" style={{ color: mutedColor }}>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
