import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SafeZonesPanel } from "@/components/dashboard/safe-zones-panel";
import { loadParentDashboardData } from "@/lib/dashboard/load-parent-dashboard-data";

export default async function ZonesPage() {
  const data = await loadParentDashboardData();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.05),_transparent_24%),radial-gradient(circle_at_right,_rgba(124,58,237,0.04),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] px-4 py-6 text-slate-900 transition-colors duration-300 dark:bg-[radial-gradient(circle_at_top,_rgba(120,223,177,0.16),_transparent_24%),radial-gradient(circle_at_right,_rgba(124,58,237,0.14),_transparent_28%),linear-gradient(180deg,#071117_0%,#09131a_42%,#05090d_100%)] dark:text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1560px] flex-col gap-6">
        <DashboardHeader
          activeRoute="zones"
          description="The zones route is where parents shape area intelligence first: safe places, caution areas, and danger spaces that later power alerts."
          parentDisplayName={data.parentDisplayName}
          parentEmail={data.parentEmail}
          title="Manage safe, caution, and danger zones for the parent platform."
        />

        <section className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="rounded-[32px] border border-slate-200/60 bg-white/70 p-5 shadow-[0_22px_60px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-white/6 dark:shadow-[0_22px_60px_rgba(3,8,13,0.22)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
              Zone stats
            </p>
            <div className="mt-4 grid gap-3">
              <ZoneMetric
                label="Active zones"
                value={`${data.safeZones.filter((zone) => zone.isActive).length}`}
              />
              <ZoneMetric
                label="Danger zones"
                value={`${data.safeZones.filter((zone) => zone.severity === "danger").length}`}
              />
              <ZoneMetric
                label="Caution zones"
                value={`${data.safeZones.filter((zone) => zone.severity === "caution").length}`}
              />
            </div>
          </aside>

          <div className="rounded-[32px] border border-slate-200/60 bg-white/70 p-3 shadow-[0_22px_60px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-white/6 dark:shadow-[0_22px_60px_rgba(3,8,13,0.22)]">
            <SafeZonesPanel initialSafeZones={data.safeZones} />
          </div>
        </section>
      </div>
    </main>
  );
}

function ZoneMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100/50 px-4 py-4 dark:border-white/8 dark:bg-black/20">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
