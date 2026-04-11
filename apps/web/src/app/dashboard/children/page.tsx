import type { ReactNode } from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { LocalTime } from "@/components/dashboard/local-time";
import { PairDevicePanel } from "@/components/dashboard/pair-device-panel";
import { loadParentDashboardData } from "@/lib/dashboard/load-parent-dashboard-data";

export default async function ChildrenPage() {
  const data = await loadParentDashboardData();

  return (
    <main className="min-h-full bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      {/* Body */}
      <div className="mx-auto max-w-[1560px] px-4 py-5 sm:px-5">
        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">

          {/* Sidebar */}
          <aside className="flex flex-col gap-4">

            {/* Pair device panel — unstyled passthrough */}
            <PairDevicePanel
              children={data.children.map((child) => ({
                id: child.id,
                displayName: child.displayName,
              }))}
            />

            {/* Roster stats */}
            <div className="rounded-xl border border-neutral-200/80 bg-white p-4 dark:border-white/[0.07] dark:bg-neutral-900">
              <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-600">
                Roster stats
              </p>
              <div className="space-y-1.5">
                <StatRow label="Children tracked" value={String(data.children.length)} />
                <StatRow label="Online now" value={String(data.stats.onlineCount)} valueColor="text-emerald-600 dark:text-emerald-400" />
                <StatRow label="Danger states" value={String(data.stats.dangerCount)} valueColor={data.stats.dangerCount > 0 ? "text-red-500 dark:text-red-400" : undefined} />
                <StatRow label="Active zones" value={String(data.stats.activeZonesCount)} />
              </div>
            </div>
          </aside>

          {/* Children grid */}
          <section>
            {data.children.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-8 text-[13px] text-neutral-400 dark:border-white/[0.07] dark:bg-neutral-900 dark:text-neutral-600">
                No paired children yet. Use the panel on the left to pair a device.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {data.children.map((child) => (
                  <ChildCard key={child.id} child={child} />
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </main>
  );
}

// ─── Child card ───────────────────────────────────────────────────────────────

function ChildCard({ child }: { child: Awaited<ReturnType<typeof loadParentDashboardData>>["children"][number] }) {
  const statusTone = getStatusTone(child.status);

  return (
    <article className="rounded-xl border border-neutral-200/80 bg-white dark:border-white/[0.07] dark:bg-neutral-900">

      {/* Card header */}
      <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-4 py-4 dark:border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[14px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            {child.displayName.trim().charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-neutral-900 dark:text-white">
              {child.displayName}
            </h2>
            <p className="text-[11.5px] text-neutral-400 dark:text-neutral-600">
              {child.deviceName ?? "Unnamed device"} · {child.platform ?? "unknown"}
            </p>
          </div>
        </div>
        <span className={[
          "mt-0.5 shrink-0 rounded-full border px-2.5 py-1 text-[10.5px] font-medium capitalize",
          statusTone === "green"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08] dark:text-emerald-400"
            : statusTone === "amber"
              ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/[0.08] dark:text-amber-400"
              : statusTone === "red"
                ? "border-red-200 bg-red-50 text-red-600 dark:border-red-500/25 dark:bg-red-500/[0.08] dark:text-red-400"
                : "border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-white/[0.07] dark:bg-neutral-800 dark:text-neutral-500",
        ].join(" ")}>
          {child.status}
        </span>
      </div>

      {/* Info grid */}
      <dl className="grid grid-cols-2 gap-px bg-neutral-100 dark:bg-white/[0.04]">
        <InfoCell label="Zone" value={child.currentZoneLabel ?? "Outside known zones"} />
        <InfoCell label="Battery" value={formatBatteryLevel(child.batteryLevel)} highlight={getBatteryHighlight(child.batteryLevel)} />
        <InfoCell label="Charging" value={child.isCharging == null ? "—" : child.isCharging ? "Charging" : "Not charging"} />
        <InfoCell label="Speed" value={formatSpeed(child.speedMetersPerSecond)} />
        <InfoCell label="Network" value={child.networkType ?? "—"} />
        <InfoCell label="Source" value={child.locationSource ?? "—"} />
        <InfoCell
          label="Location"
          value={`${formatCoordinate(child.lastLatitude)}, ${formatCoordinate(child.lastLongitude)}`}
          mono
        />
        <InfoCell
          label="Heartbeat"
          value={child.deviceLastSeenAt ? <LocalTime value={child.deviceLastSeenAt} /> : "Awaiting"}
        />
      </dl>
    </article>
  );
}

// ─── InfoCell ─────────────────────────────────────────────────────────────────

function InfoCell({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value: ReactNode;
  highlight?: "green" | "amber" | "red";
  mono?: boolean;
}) {
  const valueClass = highlight === "green"
    ? "text-emerald-600 dark:text-emerald-400"
    : highlight === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : highlight === "red"
        ? "text-red-500 dark:text-red-400"
        : "text-neutral-800 dark:text-neutral-200";

  return (
    <div className="bg-white px-4 py-3 dark:bg-neutral-900">
      <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-600">
        {label}
      </p>
      <p className={[
        "mt-1.5 text-[12.5px] font-medium",
        mono ? "font-mono text-[11.5px]" : "",
        valueClass,
      ].join(" ")}>
        {value}
      </p>
    </div>
  );
}

// ─── Sidebar components ───────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2.5 dark:border-white/[0.05] dark:bg-neutral-800/40">
      <span className="text-[12.5px] text-neutral-500 dark:text-neutral-500">{label}</span>
      <span className={["text-[13px] font-semibold tabular-nums", valueColor ?? "text-neutral-800 dark:text-neutral-200"].join(" ")}>
        {value}
      </span>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusTone(status: string): "green" | "amber" | "red" | "neutral" {
  if (status === "safe") return "green";
  if (status === "warning") return "amber";
  if (status === "danger") return "red";
  return "neutral";
}

function getBatteryHighlight(level: number | null): "green" | "amber" | "red" | undefined {
  if (level == null) return undefined;
  if (level > 0.4) return "green";
  if (level > 0.2) return "amber";
  return "red";
}

function formatBatteryLevel(value: number | null) {
  if (value == null) return "—";
  return `${Math.round(value * 100)}%`;
}

function formatSpeed(value: number | null) {
  if (value == null) return "—";
  const kmh = value * 3.6;
  return `${kmh.toFixed(kmh >= 10 ? 0 : 1)} km/h`;
}

function formatCoordinate(value: number | null) {
  if (value == null) return "—";
  return value.toFixed(6);
}