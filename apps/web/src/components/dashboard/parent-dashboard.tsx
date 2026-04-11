"use client";

import dynamic from "next/dynamic";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import type { RouteHistoryPoint } from "@/components/dashboard/live-location-map";
import { LocalTime } from "@/components/dashboard/local-time";
import { type SafeZone } from "@/components/dashboard/safe-zones-panel";
import { TelegramAlerts } from "@/components/dashboard/telegram-alerts";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

const LiveLocationMap = dynamic(
  () =>
    import("@/components/dashboard/live-location-map").then(
      (module) => module.LiveLocationMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-full items-center justify-center text-sm text-neutral-400 dark:text-neutral-600">
        Loading map…
      </div>
    ),
  },
);

type ChildSummary = {
  id: string;
  displayName: string;
  status: string;
  platform: string | null;
  deviceName: string | null;
  currentZoneLabel: string | null;
  deviceLastSeenAt: string | null;
  appVersion: string | null;
  osVersion: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastAccuracyMeters: number | null;
  lastRecordedAt: string | null;
  batteryLevel: number | null;
  isCharging: boolean | null;
  networkType: string | null;
  speedMetersPerSecond: number | null;
  locationSource: string | null;
};

type ParentDashboardProps = {
  parentId: string;
  parentDisplayName: string;
  parentEmail: string;
  activeRoute?: "overview" | "children" | "activity" | "zones" | "devices";
  isTelegramLinked: boolean;
  initialSelectedChildId?: string | null;
  children: ChildSummary[];
  recentEvents: ChildTimelineEvent[];
  safeZones: SafeZone[];
};

type ChildTimelineEvent = {
  id: string;
  childId: string;
  childDisplayName: string;
  type: string;
  title: string;
  detail: string | null;
  createdAt: string;
};

type DeviceStatusResponse = {
  batteryLevel: number | null;
  isCharging: boolean | null;
  networkType: string | null;
  speedMetersPerSecond: number | null;
  source: string | null;
  lastSeenAt: string | null;
  lastLocationRecordedAt: string | null;
  appVersion: string | null;
  osVersion: string | null;
};

type RouteHistoryResponse = {
  childId: string;
  hours: number;
  points: RouteHistoryPoint[];
};

const historyWindowOptions = [1, 3, 6, 12] as const;

export function ParentDashboard({
  parentId,
  parentDisplayName,
  parentEmail,
  activeRoute = "overview",
  isTelegramLinked,
  initialSelectedChildId = null,
  children,
  recentEvents,
  safeZones,
}: ParentDashboardProps) {
  const [liveChildren, setLiveChildren] = useState(children);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(initialSelectedChildId);
  const [selectedChildFocusKey, setSelectedChildFocusKey] = useState("initial");
  const [liveRecentEvents, setLiveRecentEvents] = useState(recentEvents);
  const [historyWindowHours, setHistoryWindowHours] = useState<(typeof historyWindowOptions)[number]>(6);
  const [routeHistory, setRouteHistory] = useState<RouteHistoryPoint[]>([]);
  const [routeHistoryLoading, setRouteHistoryLoading] = useState(false);
  const liveChildrenRef = useRef(liveChildren);
  const childIdSignature = liveChildren.map((c) => c.id).sort().join(",");

  useEffect(() => { setLiveChildren(children); }, [children]);
  useEffect(() => { setLiveRecentEvents(recentEvents); }, [recentEvents]);
  useEffect(() => { liveChildrenRef.current = liveChildren; }, [liveChildren]);

  useEffect(() => {
    if (liveChildren.length === 0) {
      setSelectedChildId(null);
      setSelectedChildFocusKey("none");
      return;
    }
    setSelectedChildId((cur) => {
      if (cur && !liveChildren.some((c) => c.id === cur)) return null;
      return cur;
    });
  }, [liveChildren]);

  const refreshChildDeviceStatus = useEffectEvent(async (childId: string) => {
    try {
      const res = await fetch(`/api/children/${childId}/device-status`, { cache: "no-store" });
      if (!res.ok) return;
      const status = (await res.json()) as DeviceStatusResponse;
      setLiveChildren((cur) =>
        cur.map((c) =>
          c.id === childId
            ? { ...c, batteryLevel: status.batteryLevel, isCharging: status.isCharging, networkType: status.networkType, speedMetersPerSecond: status.speedMetersPerSecond, locationSource: status.source, deviceLastSeenAt: status.lastSeenAt ?? c.deviceLastSeenAt, appVersion: status.appVersion, osVersion: status.osVersion }
            : c,
        ),
      );
    } catch (e) {
      console.log("[realtime] failed to refresh child device status:", e);
    }
  });

  useEffect(() => {
    if (!selectedChildId) { setRouteHistory([]); setRouteHistoryLoading(false); return; }
    setRouteHistory([]);
    setRouteHistoryLoading(true);
    const ac = new AbortController();
    void (async () => {
      try {
        const res = await fetch(`/api/children/${selectedChildId}/route-history?hours=${historyWindowHours}`, { cache: "no-store", signal: ac.signal });
        if (!res.ok) { if (!ac.signal.aborted) setRouteHistory([]); return; }
        const data = (await res.json()) as RouteHistoryResponse;
        if (!ac.signal.aborted) setRouteHistory(data.points);
      } catch {
        if (!ac.signal.aborted) setRouteHistory([]);
      } finally {
        if (!ac.signal.aborted) setRouteHistoryLoading(false);
      }
    })();
    return () => ac.abort();
  }, [historyWindowHours, selectedChildId]);

  useEffect(() => {
    const supabase = createSupabaseClient();
    const ch = supabase
      .channel(`parent-children-${parentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "children", filter: `parent_id=eq.${parentId}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          const inserted = mapRealtimeChild(payload.new as RealtimeChildRow);
          setLiveChildren((cur) => {
            if (cur.some((c) => c.id === inserted.id)) return cur;
            return [{ ...inserted, platform: null, deviceName: null, appVersion: null, osVersion: null, batteryLevel: null, isCharging: null, networkType: null, speedMetersPerSecond: null, locationSource: null } as ChildSummary, ...cur];
          });
          void refreshChildDeviceStatus(inserted.id);
        } else if (payload.eventType === "UPDATE") {
          const updated = mapRealtimeChild(payload.new as RealtimeChildRow);
          setLiveChildren((cur) => cur.map((c) => c.id === updated.id ? { ...c, ...updated } : c));
          void refreshChildDeviceStatus(updated.id);
        } else if (payload.eventType === "DELETE") {
          const id = (payload.old as { id?: string }).id;
          if (id) setLiveChildren((cur) => cur.filter((c) => c.id !== id));
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [parentId, refreshChildDeviceStatus]);

  useEffect(() => {
    const childIds = childIdSignature ? childIdSignature.split(",") : [];
    if (childIds.length === 0) return;
    const supabase = createSupabaseClient();
    const channels = childIds.flatMap((childId) => {
      const dsCh = supabase
        .channel(`parent-device-status-${parentId}-${childId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "device_status", filter: `child_id=eq.${childId}` }, (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { child_id?: string }).child_id;
            if (id) setLiveChildren((cur) => cur.map((c) => c.id === id ? { ...c, batteryLevel: null, isCharging: null, networkType: null, speedMetersPerSecond: null, locationSource: null } : c));
            return;
          }
          const ns = payload.new as RealtimeDeviceStatusRow;
          setLiveChildren((cur) => cur.map((c) => c.id === ns.child_id ? { ...c, batteryLevel: ns.battery_level, isCharging: ns.is_charging, networkType: ns.network_type, speedMetersPerSecond: ns.speed_meters_per_second, locationSource: ns.source, deviceLastSeenAt: ns.last_seen_at, appVersion: ns.app_version, osVersion: ns.os_version } : c));
        })
        .subscribe();

      const evCh = supabase
        .channel(`parent-child-events-${parentId}-${childId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "child_events", filter: `child_id=eq.${childId}` }, (payload) => {
          const ne = payload.new as RealtimeChildEventRow;
          const child = liveChildrenRef.current.find((c) => c.id === ne.child_id);
          if (!child) return;
          setLiveRecentEvents((cur) => [{ id: ne.id, childId: ne.child_id, childDisplayName: child.displayName, type: ne.type, title: ne.title, detail: ne.detail, createdAt: ne.created_at }, ...cur.filter((e) => e.id !== ne.id)].slice(0, 20));
        })
        .subscribe();

      return [dsCh, evCh];
    });
    return () => { channels.forEach((ch) => { void supabase.removeChannel(ch); }); };
  }, [childIdSignature, parentId]);

  const selectedChild = selectedChildId ? (liveChildren.find((c) => c.id === selectedChildId) ?? null) : null;
  const onlineCount = liveChildren.filter((c) => getDevicePresenceTone(c) === "online").length;
  const staleCount = liveChildren.filter((c) => getDevicePresenceTone(c) === "stale").length;
  const dangerCount = liveChildren.filter((c) => c.status === "danger").length;
  const activeZonesCount = safeZones.filter((z) => z.isActive).length;

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">

      {/* Header */}
      <div className="shrink-0 px-4 py-3 sm:px-5">
        <DashboardHeader
          activeRoute={activeRoute}
          description="Parent command center for live movement, zones, device state, and recent activity."
          parentDisplayName={parentDisplayName}
          parentEmail={parentEmail}
          title="Parent operations"
        />
      </div>

      {/* Summary bar */}
      <div className="shrink-0 border-b border-neutral-200/70 bg-white px-5 dark:border-white/[0.06] dark:bg-neutral-900">
        <div className="flex items-center gap-6 py-2.5">
          <SummaryItem label="Online" value={String(onlineCount)} tone="green" />
          <div className="h-4 w-px bg-neutral-200 dark:bg-white/10" />
          <SummaryItem label="Stale" value={String(staleCount)} tone={staleCount > 0 ? "red" : "neutral"} />
          <div className="h-4 w-px bg-neutral-200 dark:bg-white/10" />
          <SummaryItem label="Alerts" value={String(dangerCount)} tone={dangerCount > 0 ? "amber" : "neutral"} />
          <div className="h-4 w-px bg-neutral-200 dark:bg-white/10" />
          <SummaryItem label="Active zones" value={String(activeZonesCount)} tone="neutral" />
          <div className="ml-auto flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-600">Live</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1">

        {/* Sidebar */}
        <aside className="flex w-[300px] shrink-0 flex-col overflow-y-auto border-r border-neutral-200/70 bg-white dark:border-white/[0.06] dark:bg-neutral-900">

          {/* Children section */}
          <div className="border-b border-neutral-200/70 p-4 dark:border-white/[0.06]">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-600">
                Children
              </p>
              <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:border-white/[0.07] dark:bg-neutral-800 dark:text-neutral-400">
                {liveChildren.length}
              </span>
            </div>

            {liveChildren.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-[12.5px] text-neutral-400 dark:border-white/[0.07] dark:bg-neutral-800/50 dark:text-neutral-600">
                No paired children yet.
              </div>
            ) : (
              <div className="space-y-1.5">
                {liveChildren.map((child) => {
                  const presenceTone = getDevicePresenceTone(child);
                  const isSelected = selectedChildId === child.id;
                  return (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => {
                        if (selectedChildId === child.id) {
                          setSelectedChildId(null);
                          setSelectedChildFocusKey("none");
                        } else {
                          setSelectedChildId(child.id);
                          setSelectedChildFocusKey(`manual:${child.id}:${Date.now()}`);
                        }
                      }}
                      className={[
                        "w-full rounded-xl border px-3 py-3 text-left transition-all duration-100",
                        isSelected
                          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-500/[0.07]"
                          : "border-neutral-200/80 bg-white hover:border-neutral-300 hover:bg-neutral-50 dark:border-white/[0.07] dark:bg-transparent dark:hover:bg-white/[0.03]",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={[
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
                          isSelected
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300"
                            : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
                        ].join(" ")}>
                          {getChildInitial(child.displayName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                            {child.displayName}
                          </p>
                          <p className="truncate text-[11.5px] text-neutral-400 dark:text-neutral-600">
                            {child.deviceName ?? "Unnamed"} · {child.platform ?? "unknown"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] text-neutral-400 dark:text-neutral-600">Battery</p>
                          <p className="text-[12.5px] font-medium text-neutral-800 dark:text-neutral-200">
                            {formatBatteryLevel(child.batteryLevel)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <PresenceTag tone={presenceTone} label={getDevicePresenceLabel(child)} />
                        <StatusTag status={child.status} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Route window section */}
          <div className="border-b border-neutral-200/70 p-4 dark:border-white/[0.06]">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-600">
              Route window
            </p>
            <div className="flex gap-1.5">
              {historyWindowOptions.map((hours) => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => setHistoryWindowHours(hours)}
                  className={[
                    "flex-1 rounded-lg border py-1.5 text-[12.5px] font-medium transition-all duration-100",
                    historyWindowHours === hours
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/[0.08] dark:text-emerald-400"
                      : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 dark:border-white/[0.07] dark:bg-transparent dark:text-neutral-600 dark:hover:text-neutral-400",
                  ].join(" ")}
                >
                  {hours}h
                </button>
              ))}
            </div>
          </div>

          <TelegramAlerts parentId={parentId} initialLinked={isTelegramLinked} />

          {/* Spacer fills remaining sidebar */}
          <div className="flex-1" />
        </aside>

        {/* Map */}
        <section className="relative flex min-h-0 flex-1 flex-col">
          <LiveLocationMap
            children={liveChildren}
            selectedChild={selectedChild}
            routeHistory={routeHistory}
            routeHistoryHours={historyWindowHours}
            routeHistoryLoading={routeHistoryLoading}
            safeZones={safeZones}
            selectedChildId={selectedChildId}
            selectedChildFocusKey={selectedChildFocusKey}
            viewportKey={`history:${historyWindowHours}`}
          />
        </section>
      </div>
    </main>
  );
}

// ─── Tiny presentational components ──────────────────────────────────────────

function SummaryItem({ label, value, tone }: { label: string; value: string; tone: "green" | "red" | "amber" | "neutral" }) {
  const valueClass =
    tone === "green" ? "text-emerald-600 dark:text-emerald-400"
    : tone === "red" ? "text-red-500 dark:text-red-400"
    : tone === "amber" ? "text-amber-600 dark:text-amber-400"
    : "text-neutral-800 dark:text-neutral-200";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-600">{label}</span>
      <span className={`text-[13px] font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

function PresenceTag({ tone, label }: { tone: ReturnType<typeof getDevicePresenceTone>; label: string }) {
  const cls =
    tone === "online" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08] dark:text-emerald-400"
    : tone === "recent" ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/[0.08] dark:text-amber-400"
    : tone === "stale" ? "border-red-200 bg-red-50 text-red-600 dark:border-red-500/25 dark:bg-red-500/[0.08] dark:text-red-400"
    : "border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-white/[0.07] dark:bg-neutral-800 dark:text-neutral-500";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

function StatusTag({ status }: { status: string }) {
  const cls =
    status === "safe" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08] dark:text-emerald-400"
    : status === "warning" ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/[0.08] dark:text-amber-400"
    : status === "danger" ? "border-red-200 bg-red-50 text-red-600 dark:border-red-500/25 dark:bg-red-500/[0.08] dark:text-red-400"
    : "border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-white/[0.07] dark:bg-neutral-800 dark:text-neutral-500";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10.5px] font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}

// ─── Realtime types ───────────────────────────────────────────────────────────

type RealtimeChildRow = {
  id: string;
  display_name: string;
  status: string;
  current_zone_label: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_accuracy_meters: number | null;
  last_recorded_at: string | null;
};

type RealtimeDeviceStatusRow = {
  child_id: string;
  battery_level: number | null;
  is_charging: boolean | null;
  network_type: string | null;
  speed_meters_per_second: number | null;
  source: string | null;
  last_seen_at: string | null;
  app_version: string | null;
  os_version: string | null;
};

type RealtimeChildEventRow = {
  id: string;
  child_id: string;
  type: string;
  title: string;
  detail: string | null;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapRealtimeChild(child: RealtimeChildRow): Partial<ChildSummary> & Pick<ChildSummary, "id"> {
  return {
    id: child.id,
    displayName: child.display_name,
    status: child.status,
    currentZoneLabel: child.current_zone_label,
    deviceLastSeenAt: child.last_recorded_at,
    lastLatitude: child.last_latitude,
    lastLongitude: child.last_longitude,
    lastAccuracyMeters: child.last_accuracy_meters,
    lastRecordedAt: child.last_recorded_at,
  };
}

function formatBatteryLevel(value: number | null) {
  if (value == null) return "—";
  return `${Math.round(value * 100)}%`;
}

function getDevicePresenceLabel(child: ChildSummary) {
  const hb = child.deviceLastSeenAt ?? child.lastRecordedAt;
  if (!hb) return "Awaiting heartbeat";
  const age = Date.now() - new Date(hb).getTime();
  if (age <= 2 * 60 * 1000) return "Online";
  if (age <= 10 * 60 * 1000) return "Recently seen";
  return "Stale";
}

function getDevicePresenceTone(child: ChildSummary): "online" | "recent" | "stale" | "idle" {
  const hb = child.deviceLastSeenAt ?? child.lastRecordedAt;
  if (!hb) return "idle";
  const age = Date.now() - new Date(hb).getTime();
  if (age <= 2 * 60 * 1000) return "online";
  if (age <= 10 * 60 * 1000) return "recent";
  return "stale";
}

function getChildInitial(displayName: string) {
  return displayName.trim().charAt(0).toUpperCase() || "C";
}