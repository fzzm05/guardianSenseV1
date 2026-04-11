import { Skeleton } from "@/components/ui/skeleton";

export default function ZonesLoading() {
  return (
    <main className="min-h-full bg-neutral-50 dark:bg-neutral-950">
      
      {/* Summary Bar Skeleton */}
      <div className="border-b border-neutral-200/70 bg-white dark:border-white/[0.06] dark:bg-neutral-900">
        <div className="mx-auto flex max-w-[1560px] items-center gap-6 px-5 py-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-6" />
              </div>
              {i < 5 && <div className="h-4 w-px bg-neutral-200 dark:bg-white/[0.07]" />}
            </div>
          ))}
        </div>
      </div>

      {/* Body Skeleton */}
      <div className="mx-auto max-w-[1560px] px-4 py-5 sm:px-5">
        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">

          {/* Sidebar Skeletons */}
          <aside className="flex flex-col gap-3">
            
            {/* Stats Card Skeleton */}
            <div className="rounded-xl border border-neutral-200/80 bg-white p-4 dark:border-white/[0.07] dark:bg-neutral-900">
              <Skeleton className="h-2 w-20 mb-3" />
              <div className="space-y-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2.5 dark:border-white/[0.05] dark:bg-neutral-800/40">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-6" />
                  </div>
                ))}
              </div>
            </div>

            {/* Severity Legend Skeleton */}
            <div className="rounded-xl border border-neutral-200/80 bg-white p-4 dark:border-white/[0.07] dark:bg-neutral-900">
              <Skeleton className="h-2 w-24 mb-3" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <Skeleton className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Panel Skeleton */}
          <div className="rounded-xl border border-neutral-200/80 bg-white dark:border-white/[0.07] dark:bg-neutral-900">
            <div className="flex flex-col h-full">
              
              {/* Panel Header */}
              <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-white/[0.05]">
                <div className="space-y-1.5">
                  <Skeleton className="h-2 w-16" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>

              {/* Form Areas */}
              <div className="border-b border-neutral-100 px-5 py-4 dark:border-white/[0.05] space-y-5">
                <Skeleton className="h-2 w-64" /> {/* Hint */}
                
                {/* Search field */}
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-2 w-24" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                  <div className="flex flex-col justify-end">
                    <Skeleton className="h-10 w-24 rounded-lg" />
                  </div>
                </div>

                {/* Create fields */}
                <div className="grid grid-cols-2 gap-2 xl:grid-cols-[minmax(0,1.2fr)_0.8fr_0.7fr_auto]">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-1.5">
                      <Skeleton className="h-2 w-20" />
                      <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                  ))}
                  <div className="flex flex-col justify-end col-span-2 xl:col-span-1">
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                </div>
                
                <Skeleton className="h-2 w-48" /> {/* Footer hint */}
              </div>

              {/* List Area */}
              <div className="flex-1 divide-y divide-neutral-100 dark:divide-white/[0.05]">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="flex items-center gap-3 flex-1">
                      <Skeleton className="h-2 w-2 rounded-full" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-2 w-24" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-12 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
