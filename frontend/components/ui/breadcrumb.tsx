import Link from "next/link";
import { Fragment } from "react";
import { ChevronRight } from "lucide-react";

type Item = { label: string; href?: string };

export function Breadcrumb({ items }: { items: Item[] }) {
  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground">
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground transition-colors truncate">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium truncate">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
