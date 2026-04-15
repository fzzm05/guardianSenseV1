import Image from "next/image";
import Link from "next/link";
import {Download} from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">

      {/* ── Nav ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-neutral-50/95 backdrop-blur-sm dark:border-white/[0.06] dark:bg-neutral-950/95">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 shadow-[0_1px_2px_rgba(16,185,129,0.4)]">
              <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
            <span className="text-[14px] font-semibold tracking-[-0.01em] text-neutral-900 dark:text-white">GuardianSense</span>
          </div>
          <nav className="hidden items-center gap-6 text-[13px] text-neutral-500 sm:flex dark:text-neutral-400">
            <a href="#features" className="hover:text-neutral-900 dark:hover:text-white">Features</a>
            <a href="#how-it-works" className="hover:text-neutral-900 dark:hover:text-white">How it works</a>
            <a href="#download" className="hover:text-neutral-900 dark:hover:text-white">Download</a>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-[13px] font-medium text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-neutral-900 px-3.5 py-1.5 text-[12.5px] font-medium text-white transition hover:bg-neutral-800 dark:bg-emerald-500 dark:text-neutral-900 dark:hover:bg-emerald-500/90"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-5 pb-16 pt-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11.5px] font-medium text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Real-time child safety · Built for parents
        </div>

        <h1 className="mx-auto mt-5 max-w-3xl text-[44px] font-semibold leading-[1.1] tracking-[-0.03em] text-neutral-900 dark:text-white sm:text-[56px]">
          Know where your child is,{" "}
          <span className="text-emerald-500">always.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-[17px] leading-7 text-neutral-500 dark:text-neutral-400">
          GuardianSense pairs with your child&apos;s device to deliver live location tracking, zone alerts, battery warnings, and Telegram push notifications — in one clean dashboard.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            Get started free
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </a>
          <a
            href="https://expo.dev/accounts/fzzm05/projects/guardiansense/builds/19696dd5-2e6c-46f2-94ec-65eb2153db00"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200/80 bg-white px-5 py-2.5 text-[14px] font-medium text-neutral-600 shadow-sm transition hover:border-neutral-300 hover:text-neutral-900 dark:border-white/[0.08] dark:bg-neutral-900 dark:text-neutral-300"
          >
            <Download size={16}/> Download child app
          </a>
        </div>
      </section>

      {/* ── Dashboard preview illustration ─────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-5 pb-20">
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.06)] dark:border-white/[0.06] dark:bg-neutral-900">
          {/* Simulated browser chrome */}
          <div className="flex items-center gap-1.5 border-b border-neutral-100 bg-neutral-50 px-4 py-3 dark:border-white/[0.05] dark:bg-neutral-900/80">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <div className="mx-auto flex w-64 items-center justify-center rounded-md bg-neutral-100 px-3 py-1 text-[11px] text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600">
              guardian-sense-v1-web.vercel.app
            </div>
          </div>

          {/* Mock dashboard */}
          <div className="flex h-72 overflow-hidden sm:h-96">
            {/* Sidebar mock */}
            <div className="hidden w-52 shrink-0 flex-col gap-1 border-r border-neutral-100 bg-white p-3 dark:border-white/[0.05] dark:bg-neutral-900 sm:flex">
              {["Ali — safe", "Zara — online", "Omar — offline"].map((label, i) => (
                <div key={i} className={`rounded-xl border px-3 py-2.5 text-[12px] ${i === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/[0.07] dark:text-emerald-300" : "border-neutral-100 bg-white text-neutral-500 dark:border-white/[0.04] dark:bg-transparent dark:text-neutral-600"}`}>
                  {label}
                </div>
              ))}
              <div className="mt-auto">
                <div className="rounded-lg border border-[#229ED9]/30 bg-[#229ED9]/10 px-3 py-2 text-[11.5px] text-[#229ED9] dark:text-[#54bdf1]">
                  🔗 Link Telegram
                </div>
              </div>
            </div>

            {/* Map mock */}
            <div className="relative flex-1 bg-[#e8edf3] dark:bg-neutral-800">
              {/* Simulated map tiles */}
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: "repeating-linear-gradient(0deg, #ccc 0px, transparent 1px, transparent 40px, #ccc 40px), repeating-linear-gradient(90deg, #ccc 0px, transparent 1px, transparent 40px, #ccc 40px)",
              }} />

              {/* Geofence circle */}
              <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-400 bg-emerald-400/15" />

              {/* Child marker */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow-lg text-[11px] font-bold text-white">A</div>
              </div>

              {/* Top-right hint */}
              <div className="absolute right-3 top-3 rounded-lg border border-neutral-200/80 bg-white/95 px-2.5 py-1.5 text-[10px] text-neutral-400 shadow-sm backdrop-blur-sm dark:border-white/[0.08] dark:bg-neutral-900/95">
                Click marker for live status
              </div>

              {/* Bottom-left route card */}
              <div className="absolute bottom-3 left-3 rounded-xl border border-neutral-200/80 bg-white/95 p-2.5 text-[10px] shadow-sm backdrop-blur-sm dark:border-white/[0.08] dark:bg-neutral-900/95">
                <div className="font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-600">Route history</div>
                <div className="mt-1 text-neutral-500 dark:text-neutral-500">Last 6h · 42 points</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-[1200px] px-5 pb-20">
        <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-600">Features</p>
        <h2 className="mb-10 text-center text-[28px] font-semibold tracking-[-0.02em] text-neutral-900 dark:text-white">Everything you need, nothing you don&apos;t.</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "📍",
              title: "Live location",
              body: "See your child's exact GPS position on a real-time map. Updates the moment they move.",
            },
            {
              icon: "🔔",
              title: "Telegram alerts",
              body: "Instant push notifications via Telegram when a child exits a safe zone or battery drops.",
            },
            {
              icon: "🗺️",
              title: "Geofence zones",
              body: "Draw safe zones, caution areas, and danger spaces. Get alerted on every transition.",
            },
            {
              icon: "🔋",
              title: "Battery monitoring",
              body: "Track device battery level and charging state in real-time. Never be caught off guard.",
            },
            {
              icon: "🚗",
              title: "Speed detection",
              body: "Speed-based alerts surface unusual movement — like a vehicle trip that wasn't planned.",
            },
            {
              icon: "📜",
              title: "Activity history",
              body: "Full timeline of zone entries, exits, charging events, and alert history all in one place.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-neutral-200/80 bg-white p-5 dark:border-white/[0.07] dark:bg-neutral-900">
              <div className="mb-3 text-2xl">{f.icon}</div>
              <h3 className="mb-1.5 text-[14px] font-semibold text-neutral-900 dark:text-white">{f.title}</h3>
              <p className="text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────── */}
      <section id="how-it-works" className="border-y border-neutral-200/70 bg-white py-20 dark:border-white/[0.06] dark:bg-neutral-900">
        <div className="mx-auto max-w-[1200px] px-5">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-600">How it works</p>
          <h2 className="mb-12 text-center text-[28px] font-semibold tracking-[-0.02em] text-neutral-900 dark:text-white">Up and running in three steps.</h2>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Create a parent account",
                body: "Sign up with your email. Your dashboard is ready instantly — no setup required.",
              },
              {
                step: "02",
                title: "Install the child app",
                body: "Download the GuardianSense child app on your child's Android device and enter the pairing code.",
              },
              {
                step: "03",
                title: "Start tracking",
                body: "The child's device begins sending location, battery, and zone data immediately after pairing.",
              },
            ].map((s) => (
              <div key={s.step} className="flex flex-col gap-3">
                <div className="text-[11px] font-bold tabular-nums tracking-[0.12em] text-neutral-300 dark:text-neutral-700">{s.step}</div>
                <div className="h-px w-12 bg-neutral-200 dark:bg-white/[0.06]" />
                <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-white">{s.title}</h3>
                <p className="text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Download ───────────────────────────────────────────────── */}
      <section id="download" className="mx-auto max-w-[1200px] px-5 py-20">
        <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white dark:border-white/[0.07] dark:bg-neutral-900">
          <div className="grid gap-0 lg:grid-cols-2">
            {/* Left copy */}
            <div className="flex flex-col justify-center p-8 lg:p-12">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Child app</p>
              <h2 className="mb-4 text-[26px] font-semibold tracking-[-0.02em] text-neutral-900 dark:text-white">
                GuardianSense for Android
              </h2>
              <p className="mb-6 text-[14px] leading-7 text-neutral-500 dark:text-neutral-400">
                Install the lightweight companion app on your child&apos;s Android device. It runs quietly in the background — sending location, battery, and zone data to your dashboard in real-time.
              </p>

              <ul className="mb-8 space-y-2 text-[13px] text-neutral-500 dark:text-neutral-400">
                {["Runs in the background, minimal battery impact", "Auto-reconnects after network drops", "Secure device pairing with one-time code"].map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <span className="mt-0.5 text-emerald-500">✓</span>
                    {point}
                  </li>
                ))}
              </ul>

              {/* Google Play button */}
              <a
                href="https://expo.dev/accounts/fzzm05/projects/guardiansense/builds/19696dd5-2e6c-46f2-94ec-65eb2153db00"
                className="inline-flex w-fit items-center gap-3 rounded-xl border border-neutral-200/80 bg-neutral-50 px-4 py-3 transition hover:border-neutral-300 hover:bg-neutral-100 dark:border-white/[0.08] dark:bg-neutral-800 dark:hover:bg-neutral-700"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg text-white">
                  <Download size={20} />
                </div>
                <div>
                  <div className="text-[10px] text-neutral-400 dark:text-neutral-500">Download for</div>
                  <div className="text-[14px] font-semibold text-neutral-900 dark:text-white">Android (APK)</div>
                </div>
              </a>
            </div>

            {/* Right QR */}
            <div className="flex flex-col items-center justify-center gap-4 border-t border-neutral-100 bg-neutral-50 p-8 dark:border-white/[0.05] dark:bg-neutral-900/50 lg:border-l lg:border-t-0">
              <Image
                src="/qr-download.svg"
                alt="QR code to download GuardianSense child app"
                width={160}
                height={160}
                className="rounded-xl border border-neutral-200 dark:border-white/[0.07]"
              />
              <p className="text-center text-[12px] text-neutral-400 dark:text-neutral-600">
                Scan with your child&apos;s phone<br />to download the APK instantly
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
