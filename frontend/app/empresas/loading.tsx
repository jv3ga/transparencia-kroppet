import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="max-w-7xl mx-auto px-5 py-8">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3 w-60" />
      </div>

      <div className="flex gap-3 mb-4">
        <Skeleton className="h-9 w-56" />
      </div>

      {/* Tabla desktop */}
      <div className="hidden md:block rounded-xl border border-border overflow-hidden">
        <div className="bg-muted/40 px-4 py-3 flex gap-4">
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-[45%]" />
          <Skeleton className="h-4 w-16 ml-auto" />
          <Skeleton className="h-4 w-24" />
        </div>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-t border-border flex gap-4 items-center">
            <Skeleton className="h-3 w-6" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-3 w-12 ml-auto" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>

      {/* Cards mobile */}
      <div className="md:hidden flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <Skeleton className="h-3 w-6 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="space-y-1 text-right shrink-0">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
