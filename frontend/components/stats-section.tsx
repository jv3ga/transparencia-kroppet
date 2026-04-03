"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Stats = {
  contratos: number;
  empresas: number;
  organos: number;
  subvenciones: number;
  volumen: number;
};

function fmtCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} K`;
  return n.toLocaleString("es-ES");
}

function fmtVolumen(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(".", ",")} B€`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1).replace(".", ",")} M€`;
  return n.toLocaleString("es-ES");
}

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const startTs = useRef<number | null>(null);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (target === 0) return;
    startTs.current = null;

    const step = (ts: number) => {
      if (!startTs.current) startTs.current = ts;
      const progress = Math.min((ts - startTs.current) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(step);
      else setValue(target);
    };

    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}

function StatChip({ value, label, href, isVolumen }: {
  value: number;
  label: string;
  href: string | null;
  isVolumen?: boolean;
}) {
  const animated = useCountUp(value);
  const formatted = isVolumen ? fmtVolumen(animated) : fmtCount(animated);

  const inner = (
    <>
      <span className="text-primary font-bold text-sm tabnum"
            style={{ fontFamily: "var(--font-mono)" }}>
        {value === 0 ? (
          <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : formatted}
      </span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </>
  );

  return href ? (
    <Link href={href}
          className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors">
      {inner}
    </Link>
  ) : (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg">
      {inner}
    </div>
  );
}

export function StatsSection() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  const s = stats ?? { contratos: 0, empresas: 0, organos: 0, subvenciones: 0, volumen: 0 };

  return (
    <div className="flex flex-wrap gap-3">
      <StatChip value={s.contratos}    label="contratos indexados"     href="/contratos" />
      <StatChip value={s.empresas}     label="empresas adjudicatarias" href="/empresas" />
      <StatChip value={s.organos}      label="órganos contratantes"    href="/organos" />
      <StatChip value={s.subvenciones} label="subvenciones"            href="/subvenciones" />
      <StatChip value={s.volumen}      label="volumen adjudicado"       href={null} isVolumen />
    </div>
  );
}
