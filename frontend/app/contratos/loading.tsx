import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="max-w-7xl mx-auto px-5 py-8">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3 w-72" />
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap mb-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-44" />
      </div>

      {/* Tabla desktop */}
      <div className="hidden md:block rounded-xl border border-border overflow-hidden">
        <div className="bg-muted/40 px-4 py-3 flex gap-4">
          <Skeleton className="h-4 w-[35%]" />
          <Skeleton className="h-4 w-[20%]" />
          <Skeleton className="h-4 w-[20%]" />
          <Skeleton className="h-4 w-[10%] ml-auto" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-t border-border flex gap-4 items-center">
            <div className="w-[35%] space-y-1.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-3 w-[20%]" />
            <Skeleton className="h-3 w-[20%]" />
            <Skeleton className="h-4 w-[8%] ml-auto" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-16" />
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
            <div className="flex justify-between pt-1 border-t border-border/50">
              <Skeleton className="h-3 w-1/3" />
              <div className="space-y-1 text-right">
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
