import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="max-w-7xl mx-auto px-5 py-8 space-y-6">
      {/* Back link */}
      <Skeleton className="h-4 w-44" />

      {/* Header */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-16 w-40 rounded-lg" />
          <Skeleton className="h-16 w-48 rounded-lg" />
        </div>
      </div>

      {/* Section header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-3 w-20" />
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-9 w-44" />
      </div>

      {/* Tabla desktop */}
      <div className="hidden md:block rounded-xl border border-border overflow-hidden">
        <div className="bg-muted/40 px-4 py-3 flex gap-4">
          <Skeleton className="h-4 w-[35%]" />
          <Skeleton className="h-4 w-[20%]" />
          <Skeleton className="h-4 w-[20%]" />
          <Skeleton className="h-4 w-16 ml-auto" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-t border-border flex gap-4 items-center">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-24 ml-auto" />
          </div>
        ))}
      </div>

      {/* Cards mobile */}
      <div className="md:hidden flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex justify-between pt-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
