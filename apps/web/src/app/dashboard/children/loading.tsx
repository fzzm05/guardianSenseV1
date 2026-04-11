import { Skeleton } from "@/components/ui/skeleton";

export default function ChildrenLoading() {
  return (
    <main className="min-h-full bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      
      {/* Body Skeleton */}
      <div className="mx-auto max-w-[1560px] px-4 py-5 sm:px-5">
        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          
          {/* Sidebar Skeleton */}
          <aside className="flex flex-col gap-4">
            
            {/* Pair Device Panel Skeleton */}
            <div className="rounded-xl border border-neutral-200/80 bg-white dark:border-white/[0.07] dark:bg-neutral-900">
              <div className="border-b border-neutral-100 px-4 py-4 dark:border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-7 w-7 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-2 w-24" />
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <Skeleton className="h-9 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>

            {/* Roster Stats Skeleton */}
            <div className="rounded-xl border border-neutral-200/80 bg-white p-4 dark:border-white/[0.07] dark:bg-neutral-900">
              <Skeleton className="h-2 w-20 mb-3" />
              <div className="space-y-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2.5 dark:border-white/[0.05] dark:bg-neutral-800/40">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Children Grid Skeleton */}
          <section>
            <div className="grid gap-4 xl:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <article key={i} className="rounded-xl border border-neutral-200/80 bg-white dark:border-white/[0.07] dark:bg-neutral-900">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-4 py-4 dark:border-white/[0.05]">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-2 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>

                  {/* Info Grid Skeleton */}
                  <dl className="grid grid-cols-2 gap-px bg-neutral-100 dark:bg-white/[0.04]">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                      <div key={j} className="bg-white px-4 py-3 dark:bg-neutral-900">
                        <Skeleton className="h-2 w-12 mb-2" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
