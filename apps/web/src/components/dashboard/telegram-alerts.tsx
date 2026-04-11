"use client";

import { useEffect, useRef, useState } from "react";

const KEY = "gs_tg_prompt";
const COOLDOWN_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
const MAX_DISMISSES = 5;

function shouldShow(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return true;
    const { dismissedAt, count } = JSON.parse(raw) as { dismissedAt: number; count: number };
    if (count >= MAX_DISMISSES) return false;
    return Date.now() - dismissedAt >= COOLDOWN_MS;
  } catch {
    return true;
  }
}

function recordDismiss(): void {
  try {
    const raw = localStorage.getItem(KEY);
    const prev = raw ? (JSON.parse(raw) as { count: number }) : { count: 0 };
    localStorage.setItem(KEY, JSON.stringify({ dismissedAt: Date.now(), count: prev.count + 1 }));
  } catch {
    // ignore
  }
}

type Props = {
  parentId: string;
  initialLinked: boolean;
};

export function TelegramAlerts({ parentId, initialLinked }: Props) {
  const [linked, setLinked] = useState(initialLinked);
  const [dismissed, setDismissed] = useState(false);
  const checkingRef = useRef(false);

  useEffect(() => {
    if (!shouldShow()) setDismissed(true);
  }, []);

  // Poll for link status when user returns to the tab
  useEffect(() => {
    if (linked) return;

    const checkStatus = async () => {
      if (document.visibilityState !== "visible") return;
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        const res = await fetch("/api/telegram/status");
        if (res.ok) {
          const data = await res.json() as { linked: boolean };
          if (data.linked) setLinked(true);
        }
      } catch {
        // silently ignore
      } finally {
        checkingRef.current = false;
      }
    };

    document.addEventListener("visibilitychange", checkStatus);
    return () => document.removeEventListener("visibilitychange", checkStatus);
  }, [linked]);

  // Hide entirely once linked or dismissed
  if (linked || dismissed) return null;

  return (
    <div className="relative border-t border-neutral-200/70 p-4 dark:border-white/[0.06]">
      {/* Dismiss button */}
      <button
        aria-label="Dismiss Telegram prompt"
        onClick={() => { recordDismiss(); setDismissed(true); }}
        className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-neutral-300 transition hover:bg-neutral-100 hover:text-neutral-500 dark:text-neutral-600 dark:hover:bg-white/[0.06] dark:hover:text-neutral-400"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-600">
        Alerts
      </p>
      <p className="mb-3 pr-4 text-[12.5px] leading-relaxed text-neutral-500 dark:text-neutral-400">
        Get instant notifications via Telegram when danger zones are triggered or devices drop heartbeat.
      </p>

      <a
        href={`https://t.me/guardianSense_bot?start=${parentId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex w-full items-center justify-center gap-2 rounded-lg bg-[#229ED9]/10 px-4 py-2.5 text-[13px] font-medium text-[#229ED9] transition-all hover:bg-[#229ED9]/15 dark:bg-[#229ED9]/15 dark:text-[#54bdf1] dark:hover:bg-[#229ED9]/25"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-80 transition-transform group-hover:scale-110"
        >
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
        Link Telegram
      </a>
    </div>
  );
}
