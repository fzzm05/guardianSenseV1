import { Skeleton } from "@/components/ui/skeleton";

export default function DevicesLoading() {
  return (
    <main className="min-h-full bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-[1560px] px-4 py-5 sm:px-5">
        
        <section className="overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-sm dark:border-white/[0.07] dark:bg-neutral-900">
          
          {/* Table Header Skeleton */}
          <div className="grid grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-4 border-b border-neutral-100 bg-neutral-50/50 px-5 py-4 dark:border-white/[0.05] dark:bg-neutral-950/20">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-2 w-16" />
            ))}
          </div>

          {/* Table Rows Skeleton */}
          <div className="divide-y divide-neutral-100 dark:divide-white/[0.05]">
            {[1, 2, 3, 4, 5].map((i) => (
              <article
                key={i}
                className="grid grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-4 px-5 py-5"
              >
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-12 rounded" />
                    <Skeleton className="h-4 w-16 rounded" />
                  </div>
                </div>
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="self-center">
                    <Skeleton className={j === 1 ? "h-4 w-16" : "h-4 w-24"} />
                  </div>
                ))}
              </article>
            ))}
          </div>

        </section>
      </div>
    </main>
  );
}
