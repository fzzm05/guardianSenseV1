import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { LocalTime } from "@/components/dashboard/local-time";
import { loadParentDashboardData } from "@/lib/dashboard/load-parent-dashboard-data";

export default async function ActivityPage() {
  const data = await loadParentDashboardData();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.05),_transparent_24%),radial-gradient(circle_at_right,_rgba(124,58,237,0.04),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] px-4 py-6 text-slate-900 transition-colors duration-300 dark:bg-[radial-gradient(circle_at_top,_rgba(120,223,177,0.16),_transparent_24%),radial-gradient(circle_at_right,_rgba(124,58,237,0.14),_transparent_28%),linear-gradient(180deg,#071117_0%,#09131a_42%,#05090d_100%)] dark:text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1560px] flex-col gap-6">
        <DashboardHeader
          activeRoute="activity"
          description="Zone transitions, device events, and push alert history."
          parentDisplayName={data.parentDisplayName}
          parentEmail={data.parentEmail}
          title="Activity & Alerts"
        />

        <section className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Stats sidebar */}
          <aside className="rounded-[32px] border border-slate-200/60 bg-white/70 p-5 shadow-[0_22px_60px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-white/6 dark:shadow-[0_22px_60px_rgba(3,8,13,0.22)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
              Activity Stats
            </p>
            <div className="mt-4 grid gap-3">
              <ActivityMetric label="Events visible" value={`${data.recentEvents.length}`} />
              <ActivityMetric label="Children tracked" value={`${data.children.length}`} />
              <ActivityMetric label="Danger states" value={`${data.stats.dangerCount}`} />
              <ActivityMetric label="Online devices" value={`${data.stats.onlineCount}`} />
            </div>
          </aside>

          {/* Event Journal */}
          <section className="rounded-[32px] border border-slate-200/60 bg-white/70 p-5 shadow-[0_22px_60px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-white/6 dark:shadow-[0_22px_60px_rgba(3,8,13,0.22)]">
            <div className="flex items-center justify-between pb-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Event journal</h2>
            </div>

            <div className="mt-2 grid gap-3">
              {data.recentEvents.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/50 p-5 text-sm text-slate-500 dark:border-white/10 dark:bg-black/20 dark:text-slate-400">
                  No activity yet. Zone entries, exits, and charging transitions appear here.
                </div>
              ) : (
                data.recentEvents.map((event) => (
                  <article
                    className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]"
                    key={event.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300/90">
                          {event.childDisplayName}
                        </p>
                        <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-white">{event.title}</h3>
                        {event.detail ? (
                          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300/75">{event.detail}</p>
                        ) : null}
                      </div>
                      <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 shadow-sm dark:border-white/10 dark:bg-black/20 dark:text-slate-400">
                        <LocalTime value={event.createdAt} />
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function ActivityMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100/50 px-4 py-4 dark:border-white/8 dark:bg-black/20">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
