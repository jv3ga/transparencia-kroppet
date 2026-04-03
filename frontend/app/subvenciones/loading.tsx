import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="max-w-7xl mx-auto px-5 py-8">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-3 w-64" />
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap mb-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Tabla desktop */}
      <div className="hidden md:block rounded-xl border border-border overflow-hidden">
        <div className="bg-muted/40 px-4 py-3 flex gap-4">
          <Skeleton className="h-4 w-[28%]" />
          <Skeleton className="h-4 w-[30%]" />
          <Skeleton className="h-4 w-[12%] ml-auto" />
          <Skeleton className="h-4 w-[10%]" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-t border-border flex gap-4 items-center">
            <div className="w-[28%] space-y-1.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="w-[30%] space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-4 w-[10%] ml-auto" />
            <Skeleton className="h-3 w-[12%]" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>

      {/* Cards mobile */}
      <div className="md:hidden flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex justify-between gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <div className="flex justify-between pt-1 border-t border-border/50">
              <Skeleton className="h-3 w-1/3" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
