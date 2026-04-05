"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SubvencionCard } from "@/app/subvenciones/subvencion-card";
import { fmtCompact } from "@/lib/constants";

type SubItem = {
  id: number;
  cod_concesion: string | null;
  fecha_concesion: string | null;
  beneficiario: string | null;
  instrumento: string | null;
  importe: number | null;
  convocatoria: string | null;
  nivel1: string | null;
  nivel2: string | null;
  nivel3: string | null;
};

type Data = {
  nif: string;
  count: number;
  total: number | null;
  items: SubItem[];
};


export function EmpresaSubvenciones({ empresaId }: { empresaId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/empresas/${empresaId}/subvenciones`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [empresaId]);

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );

  if (!data || data.count === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2
          className="text-xs font-semibold tracking-widest uppercase text-muted-foreground whitespace-nowrap"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Subvenciones recibidas
        </h2>
        <div className="flex-1 h-px bg-border" />
        <span
          className="text-xs text-muted-foreground tabnum shrink-0 whitespace-nowrap"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {data.count.toLocaleString("es-ES")} · {fmtCompact(data.total)}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.items.map(s => (
          <SubvencionCard key={s.id} s={{
            ...s,
            // Quitar el NIF del inicio del beneficiario (ej: "B12345678 EMPRESA S.L." → "EMPRESA S.L.")
            beneficiario: s.beneficiario
              ? s.beneficiario.replace(/^[A-Z0-9]{7,9}\s+/, "")
              : null,
          }} />
        ))}
      </div>

      {data.count > 10 && (
        <div className="mt-3 text-center">
          <Link
            href={`/subvenciones?nif=${data.nif}`}
            className="text-xs text-primary hover:underline underline-offset-2"
          >
            Ver las {data.count.toLocaleString("es-ES")} subvenciones →
          </Link>
        </div>
      )}
    </div>
  );
}
