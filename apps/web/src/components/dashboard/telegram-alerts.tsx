"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  parentId: string;
  initialLinked: boolean;
};

export function TelegramAlerts({ parentId, initialLinked }: Props) {
  const [linked, setLinked] = useState(initialLinked);
  const checkingRef = useRef(false);

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
        // silently ignore network errors
      } finally {
        checkingRef.current = false;
      }
    };

    document.addEventListener("visibilitychange", checkStatus);
    return () => document.removeEventListener("visibilitychange", checkStatus);
  }, [linked]);

  return (
    <div className="border-b border-neutral-200/70 p-4 dark:border-white/[0.06]">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-600">
        Alerts
      </p>
      <p className="mb-3 text-[12.5px] leading-relaxed text-neutral-500 dark:text-neutral-400">
        Get instant notifications via Telegram when danger zones are triggered or devices drop heartbeat.
      </p>
      {linked ? (
        <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-[13px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <path d="m9 11 3 3L22 4" />
          </svg>
          Telegram Linked
        </div>
      ) : (
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
      )}
    </div>
  );
}
