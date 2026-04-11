"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Alert = {
  id: string;
  childDisplayName: string;
  type: string;
  priority: "low" | "medium" | "high";
  title: string;
  message: string;
  acknowledgedAt: string | null;
  createdAt: string;
};

const priorityDot: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-400",
  low: "bg-emerald-400",
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Fetch on mount
  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((data: { alerts: Alert[]; unreadCount: number }) => {
        setAlerts(data.alerts ?? []);
        setUnreadCount(data.unreadCount ?? 0);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const acknowledge = async (alertId: string) => {
    setAcknowledging(alertId);
    try {
      await fetch(`/api/alerts/${alertId}/acknowledge`, { method: "POST" });
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, acknowledgedAt: new Date().toISOString() } : a))
      );
      setUnreadCount((n) => Math.max(0, n - 1));
    } finally {
      setAcknowledging(null);
    }
  };

  const acknowledgeAll = async () => {
    for (const a of alerts.filter((x) => !x.acknowledgedAt)) {
      await acknowledge(a.id);
    }
  };

  // Show 3 on mobile / 5 on larger (handled via slice, panel always visible same count — CSS hides extra)
  const preview = alerts.slice(0, 5);

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={btnRef}
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/[0.06] dark:hover:text-neutral-200"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold leading-none text-white ring-1 ring-white dark:ring-neutral-950">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-50 mt-2 w-[340px] origin-top-right overflow-hidden rounded-2xl border border-neutral-200/80 bg-white/95 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/[0.07] dark:bg-neutral-950/95 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          style={{ maxWidth: "calc(100vw - 1.5rem)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-neutral-900 dark:text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={acknowledgeAll}
                className="text-[11px] text-neutral-400 underline-offset-2 hover:text-neutral-600 hover:underline dark:hover:text-neutral-300"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Alert list */}
          <div className="max-h-[min(380px,70vh)] overflow-y-auto">
            {!loaded ? (
              <div className="flex items-center justify-center py-8 text-xs text-neutral-400">Loading…</div>
            ) : preview.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <svg className="h-8 w-8 text-neutral-200 dark:text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">No alerts yet</p>
              </div>
            ) : (
              preview.map((alert, i) => {
                const unread = !alert.acknowledgedAt;
                return (
                  <div
                    key={alert.id}
                    className={[
                      "flex items-start gap-3 px-4 py-3 transition-colors",
                      i !== 0 && "border-t border-neutral-100 dark:border-white/[0.05]",
                      unread ? "bg-white dark:bg-transparent" : "opacity-50",
                      // Hide items 4-5 on small screens
                      i >= 3 ? "hidden sm:flex" : "",
                    ].join(" ")}
                  >
                    {/* Priority dot */}
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${priorityDot[alert.priority] ?? "bg-slate-400"}`} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-[11.5px] font-semibold text-neutral-900 dark:text-white">
                          {alert.title}
                        </p>
                        <span className="shrink-0 text-[10px] text-neutral-400 dark:text-neutral-600">
                          {timeAgo(alert.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10.5px] font-medium text-emerald-600 dark:text-emerald-400">
                        {alert.childDisplayName}
                      </p>
                      {alert.message && (
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-neutral-500 dark:text-neutral-400">
                          {alert.message}
                        </p>
                      )}
                    </div>

                    {/* Dismiss */}
                    {unread && (
                      <button
                        disabled={acknowledging === alert.id}
                        onClick={() => acknowledge(alert.id)}
                        aria-label="Dismiss"
                        className="mt-0.5 shrink-0 rounded-full p-1 text-neutral-300 transition hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-40 dark:text-neutral-600 dark:hover:bg-white/[0.06] dark:hover:text-neutral-300"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer — See all */}
          <div className="border-t border-neutral-100 px-4 py-2.5 dark:border-white/[0.06]">
            <Link
              href="/dashboard/activity"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-medium text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-white/[0.04] dark:hover:text-neutral-200"
            >
              See all notifications
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
