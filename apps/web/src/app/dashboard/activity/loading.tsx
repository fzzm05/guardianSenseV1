import { Skeleton } from "@/components/ui/skeleton";

export default function ActivityLoading() {
  return (
    <main className="min-h-full bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-[1560px] px-4 py-5 sm:px-5">
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          
          {/* Stats sidebar skeleton */}
          <aside className="flex flex-col gap-4">
            <div className="rounded-xl border border-neutral-200/80 bg-white p-4 dark:border-white/[0.07] dark:bg-neutral-900">
              <Skeleton className="h-2 w-24 mb-3" />
              <div className="grid gap-2.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50/50 px-3 py-2.5 dark:border-white/[0.05] dark:bg-neutral-800/30">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Event Journal skeleton */}
          <section className="rounded-xl border border-neutral-200/80 bg-white p-4 dark:border-white/[0.07] dark:bg-neutral-900">
            <div className="flex items-center justify-between pb-4">
              <Skeleton className="h-5 w-32" />
            </div>

            <div className="mt-2 grid gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <article
                  key={i}
                  className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-4 dark:border-white/[0.04] dark:bg-neutral-800/20"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Skeleton className="h-2 w-20 mb-3" />
                      <Skeleton className="h-4 w-3/4 mb-4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </article>
              ))}
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
