import { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Registered Devices",
};

import { LocalTime } from "@/components/dashboard/local-time";
import { loadParentDashboardData } from "@/lib/dashboard/load-parent-dashboard-data";

export default async function DevicesPage() {
  const data = await loadParentDashboardData();

  return (
    <main className="min-h-full bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="mx-auto max-w-[1560px] px-4 py-5 sm:px-5">
        
        <section className="overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-sm dark:border-white/[0.07] dark:bg-neutral-900">
          <div className="grid grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-4 border-b border-neutral-100 bg-neutral-50/50 px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500 dark:border-white/[0.05] dark:bg-neutral-950/20 dark:text-neutral-500">
            <span>Device</span>
            <span>Battery</span>
            <span>Charging</span>
            <span>Network</span>
            <span>Heartbeat</span>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-white/[0.05]">
            {data.children.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px] text-neutral-400 dark:text-neutral-600">
                No active devices found.
              </div>
            ) : (
              data.children.map((child) => (
                <article
                  className="grid grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-4 px-5 py-5 transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.02]"
                  key={child.id}
                >
                  <div className="min-w-0">
                    <div className="group relative">
                      <p className="truncate text-[14px] font-semibold text-neutral-900 dark:text-white">
                        {child.deviceName ?? "Unnamed device"}
                      </p>
                      <div className="pointer-events-none absolute bottom-full left-0 mb-2 z-50 hidden group-hover:block">
                        <div className="whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 shadow-xl dark:border-white/[0.08] dark:bg-neutral-900 dark:text-neutral-400">
                          {child.deviceName ?? "Unnamed device"}
                        </div>
                      </div>
                    </div>

                    <div className="group relative mt-1">
                      <p className="truncate text-[13px] text-neutral-500 dark:text-neutral-400">
                        {child.displayName} · {child.platform ?? "unknown"}
                      </p>
                      <div className="pointer-events-none absolute bottom-full left-0 mb-2 z-50 hidden group-hover:block">
                        <div className="whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 shadow-xl dark:border-white/[0.08] dark:bg-neutral-900 dark:text-neutral-400">
                          {child.displayName} · {child.platform ?? "unknown"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-1.5 flex gap-2">
                      <TruncatedTag 
                        label={`v${child.appVersion ?? "0.0.0"}`} 
                        fullText={`v${child.appVersion ?? "0.0.0"}`}
                      />
                      <TruncatedTag 
                        label={child.osVersion ?? "unknown os"} 
                        fullText={child.osVersion ?? "unknown os"}
                      />
                    </div>
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

function TruncatedTag({ label, fullText }: { label: string; fullText: string }) {
  return (
    <div className="group relative">
      <div className="max-w-[120px] truncate rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-500 dark:hover:bg-neutral-700">
        {label}
      </div>
      
      {/* Tooltip */}
      <div className="pointer-events-none absolute bottom-full left-0 mb-2 z-50 hidden group-hover:block">
        <div className="whitespace-pre-wrap rounded-lg border border-neutral-200 bg-white p-2.5 text-[11px] leading-relaxed text-neutral-600 shadow-xl dark:border-white/[0.08] dark:bg-neutral-900 dark:text-neutral-400 max-w-[280px]">
          {fullText}
        </div>
      </div>
    </div>
  );
}

function CellValue({ value }: { value: ReactNode }) {
  return (
    <div className="self-center text-[13.5px] font-medium text-neutral-700 dark:text-neutral-300">
      {value}
    </div>
  );
}

function formatBatteryLevel(value: number | null) {
  if (value == null) {
    return "Unknown";
  }

  const rounded = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-4 w-2.5 rounded-[2px] border border-neutral-300 p-0.5 dark:border-neutral-700 flex flex-col justify-end">
        <div 
          className="w-full bg-emerald-500 rounded-[1px]" 
          style={{ height: `${rounded}%` }} 
        />
      </div>
      <span>{rounded}%</span>
    </div>
  );
}
