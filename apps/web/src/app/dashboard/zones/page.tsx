import { Metadata } from "next";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export const metadata: Metadata = {
  title: "Safe Zones",
};
import { SafeZonesPanel } from "@/components/dashboard/safe-zones-panel";
import { loadParentDashboardData } from "@/lib/dashboard/load-parent-dashboard-data";

export default async function ZonesPage() {
  const data = await loadParentDashboardData();

  const activeCount = data.safeZones.filter((z) => z.isActive).length;
  const safeCount = data.safeZones.filter((z) => z.severity === "safe").length;
  const cautionCount = data.safeZones.filter((z) => z.severity === "caution").length;
  const dangerCount = data.safeZones.filter((z) => z.severity === "danger").length;

  return (
    <main className="min-h-full bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">

      {/* Summary bar */}
      <div className="border-b border-neutral-200/70 bg-white dark:border-white/[0.06] dark:bg-neutral-900">
        <div className="mx-auto flex max-w-[1560px] items-center gap-6 px-5 py-2.5">
          <SummaryItem label="Total" value={String(data.safeZones.length)} tone="neutral" />
          <Divider />
          <SummaryItem label="Active" value={String(activeCount)} tone="green" />
          <Divider />
          <SummaryItem label="Safe" value={String(safeCount)} tone="green" />
          <Divider />
          <SummaryItem label="Caution" value={String(cautionCount)} tone="amber" />
          <Divider />
          <SummaryItem label="Danger" value={String(dangerCount)} tone={dangerCount > 0 ? "red" : "neutral"} />
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-[1560px] px-4 py-5 sm:px-5">
        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">

          {/* Sidebar — zone stats */}
          <aside className="flex flex-col gap-3">

            {/* Stats card */}
            <div className="rounded-xl border border-neutral-200/80 bg-white p-4 dark:border-white/[0.07] dark:bg-neutral-900">
              <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-600">
                Zone stats
              </p>
              <div className="space-y-1.5">
                <StatRow label="Total zones" value={String(data.safeZones.length)} />
                <StatRow label="Active" value={String(activeCount)} valueColor="text-emerald-600 dark:text-emerald-400" />
                <StatRow label="Safe zones" value={String(safeCount)} valueColor="text-emerald-600 dark:text-emerald-400" />
                <StatRow label="Caution zones" value={String(cautionCount)} valueColor={cautionCount > 0 ? "text-amber-600 dark:text-amber-400" : undefined} />
                <StatRow label="Danger zones" value={String(dangerCount)} valueColor={dangerCount > 0 ? "text-red-500 dark:text-red-400" : undefined} />
              </div>
            </div>

            {/* Severity legend */}
            <div className="rounded-xl border border-neutral-200/80 bg-white p-4 dark:border-white/[0.07] dark:bg-neutral-900">
              <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-600">
                Severity legend
              </p>
              <div className="space-y-2">
                <LegendRow
                  color="bg-emerald-500"
                  label="Safe"
                  description="Child is within expected area"
                />
                <LegendRow
                  color="bg-amber-400"
                  label="Caution"
                  description="Notify parent on entry or exit"
                />
                <LegendRow
                  color="bg-red-500"
                  label="Danger"
                  description="Immediate alert triggered"
                />
              </div>
            </div>
          </aside>

          {/* Safe zones panel */}
          <div className="rounded-xl border border-neutral-200/80 bg-white dark:border-white/[0.07] dark:bg-neutral-900">
            <SafeZonesPanel initialSafeZones={data.safeZones} />
          </div>

        </div>
      </div>
    </main>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "amber" | "red" | "neutral";
}) {
  const valueClass =
    tone === "green" ? "text-emerald-600 dark:text-emerald-400"
    : tone === "amber" ? "text-amber-600 dark:text-amber-400"
    : tone === "red" ? "text-red-500 dark:text-red-400"
    : "text-neutral-800 dark:text-neutral-200";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-600">{label}</span>
      <span className={`text-[13px] font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="h-4 w-px bg-neutral-200 dark:bg-white/[0.07]" />;
}

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

function LegendRow({
  color,
  label,
  description,
}: {
  color: string;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
      <div>
        <p className="text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">{label}</p>
        <p className="text-[11px] text-neutral-400 dark:text-neutral-600">{description}</p>
      </div>
    </div>
  );
}