import { Metadata } from "next";
import { LocalTime } from "@/components/dashboard/local-time";
import { loadParentDashboardData } from "@/lib/dashboard/load-parent-dashboard-data";

export const metadata: Metadata = {
  title: "Activity History",
};

export default async function ActivityPage() {
  const data = await loadParentDashboardData();

  return (
    <main className="min-h-full bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto max-w-[1560px] px-4 py-5 sm:px-5">
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          
          {/* Stats sidebar */}
          <aside className="flex flex-col gap-4">
            <div className="rounded-xl border border-neutral-200/80 bg-white p-4 dark:border-white/[0.07] dark:bg-neutral-900">
              <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-600">
                Activity Stats
              </p>
              <div className="grid gap-2.5">
                <ActivityMetric label="Events visible" value={`${data.recentEvents.length}`} />
                <ActivityMetric label="Children tracked" value={`${data.children.length}`} />
                <ActivityMetric label="Danger states" value={`${data.stats.dangerCount}`} />
                <ActivityMetric label="Online devices" value={`${data.stats.onlineCount}`} />
              </div>
            </div>
          </aside>

          {/* Event Journal */}
          <section className="rounded-xl border border-neutral-200/80 bg-white p-4 dark:border-white/[0.07] dark:bg-neutral-900">
            <div className="flex items-center justify-between pb-4">
              <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-neutral-900 dark:text-white">Event journal</h2>
            </div>

            <div className="mt-2 grid gap-3">
              {data.recentEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-6 text-center text-[13px] text-neutral-400 dark:border-white/[0.07] dark:bg-neutral-950/50 dark:text-neutral-600">
                  No activity yet. Zone entries, exits, and charging transitions appear here.
                </div>
              ) : (
                data.recentEvents.map((event) => (
                  <article
                    className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-4 transition-colors hover:bg-neutral-50 dark:border-white/[0.04] dark:bg-neutral-800/20 dark:hover:bg-neutral-800/40"
                    key={event.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-emerald-600 dark:text-emerald-400/90">
                          {event.childDisplayName}
                        </p>
                        <h3 className="mt-2 text-[14.5px] font-semibold tracking-[-0.01em] text-neutral-900 dark:text-white">{event.title}</h3>
                        {event.detail ? (
                          <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                            {event.detail}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-500 shadow-sm dark:border-white/[0.07] dark:bg-neutral-900 dark:text-neutral-500">
                        <LocalTime value={event.createdAt} />
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function ActivityMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50/50 px-3 py-2.5 dark:border-white/[0.05] dark:bg-neutral-800/30">
      <span className="text-[12.5px] text-neutral-500 dark:text-neutral-500">{label}</span>
      <span className="text-[13px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{value}</span>
    </div>
  );
}
