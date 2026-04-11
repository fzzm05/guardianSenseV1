"use client";

import { useEffect, useState } from "react";

import { LocalTime } from "@/components/dashboard/local-time";

type Alert = {
  id: string;
  childId: string;
  childDisplayName: string;
  type: string;
  priority: "low" | "medium" | "high";
  title: string;
  message: string;
  acknowledgedAt: string | null;
  createdAt: string;
};

const priorityConfig = {
  high: {
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    label: "High",
  },
  medium: {
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    label: "Medium",
  },
  low: {
    dot: "bg-emerald-400",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    label: "Low",
  },
};

export function AlertsInbox() {
  const [alertList, setAlertList] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((data: { alerts: Alert[]; unreadCount: number }) => {
        setAlertList(data.alerts ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const acknowledge = async (alertId: string) => {
    setAcknowledging(alertId);
    try {
      await fetch(`/api/alerts/${alertId}/acknowledge`, { method: "POST" });
      setAlertList((prev) =>
        prev.map((a) =>
          a.id === alertId ? { ...a, acknowledgedAt: new Date().toISOString() } : a
        )
      );
      setUnreadCount((n) => Math.max(0, n - 1));
    } catch {
      // ignore
    } finally {
      setAcknowledging(null);
    }
  };

  return (
    <section className="rounded-[32px] border border-slate-200/60 bg-white/70 p-5 shadow-[0_22px_60px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-white/6 dark:shadow-[0_22px_60px_rgba(3,8,13,0.22)]">
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Alerts inbox</h2>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            className="text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline dark:text-slate-500 dark:hover:text-slate-300"
            onClick={async () => {
              for (const a of alertList.filter((x) => !x.acknowledgedAt)) {
                await acknowledge(a.id);
              }
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-sm text-slate-400 dark:text-slate-500">
          Loading alerts…
        </div>
      ) : alertList.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/50 p-5 text-sm text-slate-500 dark:border-white/10 dark:bg-black/20 dark:text-slate-400">
          No alerts yet. When a child triggers a zone, battery, or speed event you'll see it here.
        </div>
      ) : (
        <div className="grid gap-3">
          {alertList.map((alert) => {
            const p = priorityConfig[alert.priority] ?? priorityConfig.low;
            const unread = !alert.acknowledgedAt;

            return (
              <article
                key={alert.id}
                className={`rounded-[24px] border p-4 transition-all ${
                  unread
                    ? "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))]"
                    : "border-slate-100 bg-white/50 opacity-60 dark:border-white/5 dark:bg-black/10"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {/* Priority dot */}
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${p.dot} ${unread ? "ring-2 ring-offset-1 ring-current opacity-80" : ""}`} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300/90">
                          {alert.childDisplayName}
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${p.badge}`}>
                          {p.label}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-white/8 dark:text-slate-400">
                          {alert.type}
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-[15px] font-semibold text-slate-900 dark:text-white">
                        {alert.title}
                      </h3>
                      {alert.message && (
                        <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-300/70">
                          {alert.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 shadow-sm dark:border-white/10 dark:bg-black/20 dark:text-slate-400">
                      <LocalTime value={alert.createdAt} />
                    </div>
                    {unread && (
                      <button
                        disabled={acknowledging === alert.id}
                        onClick={() => acknowledge(alert.id)}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                      >
                        {acknowledging === alert.id ? "…" : "Dismiss"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
