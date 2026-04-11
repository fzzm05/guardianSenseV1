import type { ReactNode } from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { LocalTime } from "@/components/dashboard/local-time";
import { loadParentDashboardData } from "@/lib/dashboard/load-parent-dashboard-data";

export default async function DevicesPage() {
  const data = await loadParentDashboardData();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.05),_transparent_24%),radial-gradient(circle_at_right,_rgba(124,58,237,0.04),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] px-4 py-6 text-slate-900 transition-colors duration-300 dark:bg-[radial-gradient(circle_at_top,_rgba(120,223,177,0.16),_transparent_24%),radial-gradient(circle_at_right,_rgba(124,58,237,0.14),_transparent_28%),linear-gradient(180deg,#071117_0%,#09131a_42%,#05090d_100%)] dark:text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1560px] flex-col gap-6">
        <DashboardHeader
          activeRoute="devices"
          description="The devices route should become the parent-facing device health panel for battery, charging, network, heartbeat, and reconnect history."
          parentDisplayName={data.parentDisplayName}
          parentEmail={data.parentEmail}
          title="Latest device health, telemetry, and operational status."
        />

        <section className="overflow-hidden rounded-[32px] border border-slate-200/60 bg-white/70 shadow-[0_22px_60px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-white/6 dark:shadow-[0_22px_60px_rgba(3,8,13,0.22)]">
          <div className="grid grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-4 border-b border-slate-200 px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:border-white/8 dark:text-slate-400">
            <span>Device</span>
            <span>Battery</span>
            <span>Charging</span>
            <span>Network</span>
            <span>Heartbeat</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/6">
            {data.children.length === 0 ? (
              <div className="px-5 py-6 text-sm text-slate-400">No devices yet.</div>
            ) : (
              data.children.map((child) => (
                <article
                  className="grid grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-4 px-5 py-4"
                  key={child.id}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{child.deviceName ?? "Unnamed device"}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {child.displayName} · {child.platform ?? "unknown"} · {child.appVersion ?? "unknown app"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{child.osVersion ?? "Unknown OS"}</p>
                  </div>
                  <CellValue value={formatBatteryLevel(child.batteryLevel)} />
                  <CellValue value={child.isCharging == null ? "Unknown" : child.isCharging ? "Charging" : "Not charging"} />
                  <CellValue value={child.networkType ?? "Unknown"} />
                  <CellValue value={child.deviceLastSeenAt ? <LocalTime value={child.deviceLastSeenAt} /> : "Awaiting heartbeat"} />
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function CellValue({ value }: { value: ReactNode }) {
  return <div className="self-center text-sm font-medium text-slate-700 dark:text-slate-200">{value}</div>;
}

function formatBatteryLevel(value: number | null) {
  if (value == null) {
    return "Unknown";
  }

  return `${Math.round(value * 100)}%`;
}
