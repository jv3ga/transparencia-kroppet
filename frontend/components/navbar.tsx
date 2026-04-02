import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function Navbar() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-bold text-foreground">Transparencia</span>
          <span className="text-xs text-muted-foreground font-medium">by Kroppet</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/contratos"
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
          >
            Contratos
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
