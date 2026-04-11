import type { ReactNode } from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { LocalTime } from "@/components/dashboard/local-time";
import { PairDevicePanel } from "@/components/dashboard/pair-device-panel";
import { loadParentDashboardData } from "@/lib/dashboard/load-parent-dashboard-data";

export default async function ChildrenPage() {
  const data = await loadParentDashboardData();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.05),_transparent_24%),radial-gradient(circle_at_right,_rgba(124,58,237,0.04),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] px-4 py-6 text-slate-900 transition-colors duration-300 dark:bg-[radial-gradient(circle_at_top,_rgba(120,223,177,0.16),_transparent_24%),radial-gradient(circle_at_right,_rgba(124,58,237,0.14),_transparent_28%),linear-gradient(180deg,#071117_0%,#09131a_42%,#05090d_100%)] dark:text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1560px] flex-col gap-6">
        <DashboardHeader
          activeRoute="children"
          description="The children route should become the parent’s roster view, where each child can be inspected without the full map-first overview."
          parentDisplayName={data.parentDisplayName}
          parentEmail={data.parentEmail}
          title="Child roster, latest state, and current zone context."
        />

        <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <PairDevicePanel
              children={data.children.map((child) => ({
                id: child.id,
                displayName: child.displayName,
              }))}
            />

            <div className="rounded-[28px] border border-slate-200/60 bg-white/70 p-5 shadow-[0_22px_60px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-white/6 dark:shadow-[0_22px_60px_rgba(3,8,13,0.22)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Roster stats
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <InfoCell label="Children tracked" value={`${data.children.length}`} />
                <InfoCell
                  label="Online now"
                  value={`${data.stats.onlineCount}`}
                />
                <InfoCell
                  label="Danger states"
                  value={`${data.stats.dangerCount}`}
                />
                <InfoCell
                  label="Active zones"
                  value={`${data.stats.activeZonesCount}`}
                />
              </div>
            </div>
          </aside>

          <section className="grid gap-4 xl:grid-cols-2">
          {data.children.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/50 p-6 text-sm text-slate-500 dark:border-white/10 dark:bg-white/4 dark:text-slate-400 xl:col-span-2">
              No paired children yet.
            </div>
          ) : (
            data.children.map((child) => (
              <article
                className="rounded-[28px] border border-slate-200/60 bg-white/70 p-5 shadow-[0_22px_60px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-white/6 dark:shadow-[0_22px_60px_rgba(3,8,13,0.22)]"
                key={child.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                      Child
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">
                      {child.displayName}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {child.deviceName ?? "Unnamed device"} · {child.platform ?? "unknown"}
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/8 dark:text-slate-200">
                    {child.status}
                  </span>
                </div>

                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  <InfoCell label="Current zone" value={child.currentZoneLabel ?? "Outside known zones"} />
                  <InfoCell label="Battery" value={formatBatteryLevel(child.batteryLevel)} />
                  <InfoCell label="Charging" value={child.isCharging == null ? "Unknown" : child.isCharging ? "Charging" : "Not charging"} />
                  <InfoCell label="Current speed" value={formatSpeed(child.speedMetersPerSecond)} />
                  <InfoCell label="Network" value={child.networkType ?? "Unknown"} />
                  <InfoCell label="Source" value={child.locationSource ?? "Unknown"} />
                  <InfoCell label="Location" value={`${formatCoordinate(child.lastLatitude)}, ${formatCoordinate(child.lastLongitude)}`} />
                  <InfoCell label="Heartbeat" value={child.deviceLastSeenAt ? <LocalTime value={child.deviceLastSeenAt} /> : "Awaiting heartbeat"} />
                </dl>
              </article>
            ))
          )}
          </section>
        </section>
      </div>
    </main>
  );
}

function InfoCell({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100/50 p-4 dark:border-white/8 dark:bg-black/20">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function formatBatteryLevel(value: number | null) {
  if (value == null) {
    return "Unknown";
  }

  return `${Math.round(value * 100)}%`;
}

function formatSpeed(value: number | null) {
  if (value == null) {
    return "Unknown";
  }

  return `${(value * 3.6).toFixed(value * 3.6 >= 10 ? 0 : 1)} km/h`;
}

function formatCoordinate(value: number | null) {
  if (value == null) {
    return "No location yet";
  }

  return value.toFixed(6);
}
