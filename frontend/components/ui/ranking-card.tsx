import Link from "next/link";

function fmtEuros(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

type Props = {
  rank: number;
  nombre: string;
  subtitulo?: string | null;
  href: string;
  numContratos: number;
  totalImporte: number;
};

export function RankingCard({ rank, nombre, subtitulo, href, numContratos, totalImporte }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
      <span className="text-xs text-muted-foreground tabnum w-6 text-right shrink-0"
            style={{ fontFamily: "var(--font-mono)" }}>
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <Link href={href}
              className="font-medium text-sm hover:text-primary transition-colors line-clamp-2 leading-snug">
          {nombre}
        </Link>
        {subtitulo && (
          <span className="text-xs text-muted-foreground block tabnum mt-0.5"
                style={{ fontFamily: "var(--font-mono)" }}>
            {subtitulo}
          </span>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="tabnum text-sm font-semibold text-primary"
           style={{ fontFamily: "var(--font-mono)" }}>
          {fmtEuros(totalImporte)}
        </p>
        <p className="text-[10px] text-muted-foreground tabnum"
           style={{ fontFamily: "var(--font-mono)" }}>
          {numContratos.toLocaleString("es-ES")} contratos
        </p>
      </div>
    </div>
  );
}
