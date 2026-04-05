import Link from "next/link";
import { Fragment } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

type Item = { label: string; href?: string };

export function Breadcrumb({ items }: { items: Item[] }) {
  const parent = items.length >= 2 ? items[items.length - 2] : null;

  return (
    <nav className="text-xs text-muted-foreground">
      {/* Mobile: solo "← Padre" */}
      {parent?.href && (
        <Link
          href={parent.href}
          className="flex items-center gap-1 hover:text-foreground transition-colors md:hidden w-fit"
        >
          <ChevronLeft className="h-3 w-3 opacity-40 shrink-0" />
          {parent.label}
        </Link>
      )}

      {/* Desktop: breadcrumb completo */}
      <div className="hidden md:flex items-center gap-1">
        {items.map((item, i) => (
          <Fragment key={i}>
            {i > 0 && <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />}
            {item.href ? (
              <Link href={item.href} className="hover:text-foreground transition-colors truncate max-w-[200px]">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium truncate max-w-[300px]">{item.label}</span>
            )}
          </Fragment>
        ))}
      </div>
    </nav>
  );
}
