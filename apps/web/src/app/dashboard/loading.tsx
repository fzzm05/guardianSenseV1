import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <main className="flex h-full flex-col overflow-hidden bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      
      {/* Summary bar Skeleton */}
      <div className="shrink-0 border-b border-neutral-200/70 bg-white px-5 dark:border-white/[0.06] dark:bg-neutral-900">
        <div className="flex items-center gap-6 py-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Skeleton className="h-2.5 w-10" />
                <Skeleton className="h-3 w-4" />
              </div>
              {i < 3 && <div className="h-4 w-px bg-neutral-200 dark:bg-white/10" />}
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
             <Skeleton className="h-1.5 w-1.5 rounded-full" />
             <Skeleton className="h-2 w-8" />
          </div>
        </div>
      </div>

      {/* Body Skeleton */}
      <div className="flex min-h-0 flex-1">

        {/* Sidebar Skeleton */}
        <aside className="flex w-[300px] shrink-0 flex-col overflow-y-auto border-r border-neutral-200/70 bg-white dark:border-white/[0.06] dark:bg-neutral-950">
          
          {/* Children section skeleton */}
          <div className="border-b border-neutral-200/70 p-4 dark:border-white/[0.06]">
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-2 w-16" />
              <Skeleton className="h-4 w-6 rounded-full" />
            </div>
            <div className="space-y-1.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-full rounded-xl border border-neutral-200/80 bg-white px-3 py-3 dark:border-white/[0.07] dark:bg-transparent">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                    <div className="shrink-0 space-y-2">
                      <Skeleton className="h-2 w-10 ml-auto" />
                      <Skeleton className="h-3 w-8 ml-auto" />
                    </div>
                  </div>
                  <div className="mt-2.5 flex gap-1.5">
                    <Skeleton className="h-4 w-12 rounded-full" />
                    <Skeleton className="h-4 w-12 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Route window section skeleton */}
          <div className="border-b border-neutral-200/70 p-4 dark:border-white/[0.06]">
            <Skeleton className="h-2 w-24 mb-3" />
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="flex-1 h-8 rounded-lg" />
              ))}
            </div>
          </div>

          <div className="flex-1" />

          {/* Telegram panel skeleton */}
          <div className="p-4">
             <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </aside>

        {/* Map Section Skeleton */}
        <section className="relative flex min-h-0 flex-1 flex-col bg-neutral-100 dark:bg-neutral-900/50">
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="flex flex-col items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full border-2 border-emerald-500/20" />
                <Skeleton className="h-2 w-24" />
             </div>
          </div>
          {/* Shimmer overlay covers the whole map area */}
          <div className="h-full w-full animate-pulse bg-neutral-200/20 dark:bg-white/[0.02]" />
        </section>

      </div>
    </main>
  );
}
