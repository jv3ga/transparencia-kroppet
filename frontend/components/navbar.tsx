import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-5 h-13 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <span
            className="text-primary font-bold text-xs tracking-widest uppercase group-hover:text-primary/80 transition-colors"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Transparencia
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground text-xs tracking-wide group-hover:text-foreground transition-colors">
            by Kroppet
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/contratos"
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-accent transition-colors tracking-wide"
          >
            Contratos
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
