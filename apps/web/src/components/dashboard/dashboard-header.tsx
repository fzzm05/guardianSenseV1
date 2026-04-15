"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import Link from "next/link";

import { getFirebaseAuth } from "@/lib/firebase/client";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsModal } from "@/components/dashboard/settings-modal";
import { Settings } from "lucide-react";

const routeItems = [
  { id: "overview", label: "Overview", href: "/dashboard" },
  { id: "activity", label: "Activity", href: "/dashboard/activity" },
  { id: "children", label: "Children", href: "/dashboard/children" },
  { id: "zones", label: "Zones", href: "/dashboard/zones" },
  { id: "devices", label: "Devices", href: "/dashboard/devices" },
] as const;

type DashboardHeaderProps = {
  parentDisplayName: string;
  parentEmail: string;
};

export function DashboardHeader({
  parentDisplayName,
}: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Auto-detect active route from pathname
  const activeRoute = routeItems.find(item => item.href === pathname)?.id ?? "overview";


  async function handleLogout() {
    await fetch("/api/session/logout", { method: "POST" });
    await signOut(getFirebaseAuth());
    router.replace("/");
  }


  return (
    <header className="relative z-40 flex items-center justify-between gap-3 border rounded-2xl border-neutral-200/80 bg-white/95 px-3 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-xl dark:border-white/[0.07] dark:bg-neutral-950/75 dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]">

      {/* Left — brand */}
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 shadow-[0_1px_2px_rgba(16,185,129,0.4)]">
          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
          </svg>
        </div>
        <span className="hidden text-[13px] font-semibold tracking-[-0.01em] text-neutral-900 dark:text-white lg:block">
          GuardianSense
        </span>
        <div className="hidden h-4 w-px bg-neutral-200 dark:bg-white/10 lg:block" />
        <span className="hidden text-[11px] font-medium text-neutral-400 dark:text-neutral-500 lg:block">
          Command center
        </span>
      </div>

      {/* Center — nav */}
      <nav className="flex items-center gap-0.5 rounded-xl border border-neutral-200/60 bg-neutral-50 p-1 dark:border-white/[0.06] dark:bg-neutral-900">
        {routeItems.map((routeItem) => {
          const isActive = routeItem.id === activeRoute;
          return (
            <Link
              key={routeItem.id}
              href={routeItem.href}
              className={[
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-all duration-150",
                isActive
                  ? "bg-white text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_0_0_0.5px_rgba(0,0,0,0.05)] dark:bg-neutral-800 dark:text-white dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_0_0_0.5px_rgba(255,255,255,0.06)]"
                  : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300",
              ].join(" ")}
            >
              <span className={isActive ? "text-emerald-500" : "text-neutral-400 dark:text-neutral-600"}>
                <TaskbarIcon routeId={routeItem.id} />
              </span>
              <span className="hidden sm:block">{routeItem.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right — actions */}
      <div className="flex shrink-0 items-center gap-2">

        {/* Notification bell */}
        <NotificationBell />

        {/* Theme toggle */}
        <ThemeToggle />

        <div className="h-4 w-px bg-neutral-200 dark:bg-white/[0.07]" />

        {/* Avatar + name */}
        <div className="hidden items-center gap-2 md:flex">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
            {parentDisplayName?.trim().charAt(0).toUpperCase() ?? "P"}
          </div>
          <span className="text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
            {parentDisplayName}
          </span>
        </div>

        {/* Sign out */}
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-neutral-200/80 bg-white px-2.5 py-1.5 text-[12px] font-medium text-neutral-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-neutral-300 hover:text-neutral-800 dark:border-white/[0.07] dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-white/[0.12] dark:hover:text-neutral-200"
        >
          Sign out
        </button>

        {/* Settings Trigger */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200/80 bg-white text-neutral-400 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-neutral-300 hover:text-neutral-700 dark:border-white/[0.07] dark:bg-neutral-900 dark:hover:border-white/[0.12] dark:hover:text-neutral-200"
          title="Settings"
        >
          <Settings size={15} />
        </button>
      </div>

      <SettingsModal 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />
    </header>
  );
}

function TaskbarIcon({ routeId }: { routeId: (typeof routeItems)[number]["id"] }) {
  const cls = "h-3.5 w-3.5";

  if (routeId === "overview") {
    return (
      <svg aria-hidden className={cls} fill="currentColor" viewBox="0 0 24 24">
        <path d="M4 5.5h7v5H4zM13 5.5h7v8h-7zM4 12.5h7v6H4zM13 15.5h7v3h-7z" />
      </svg>
    );
  }
  if (routeId === "children") {
    return (
      <svg aria-hidden className={cls} fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm-8 2c-3.314 0-6 1.79-6 4v1h12v-1c0-2.21-2.686-4-6-4Zm8.1.4a5.9 5.9 0 0 1 3.9 1.43c.63.56 1 1.27 1 2.07V20h-5.43c.27-.54.43-1.13.43-1.75 0-1.03-.37-1.99-1.03-2.85h1.13Z" />
      </svg>
    );
  }
  if (routeId === "zones") {
    return (
      <svg aria-hidden className={cls} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Zm0-7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      </svg>
    );
  }
  if (routeId === "activity") {
    return (
      <svg aria-hidden className={cls} fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
      </svg>
    );
  }
  return (
    <svg aria-hidden className={cls} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24">
      <path d="M7 7h10v10H7z" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M18 9h3M18 15h3M3 9h3M3 15h3" />
    </svg>
  );
}