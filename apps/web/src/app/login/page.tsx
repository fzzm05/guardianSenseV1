import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

const quotes = [
  {
    text: "Knowing my daughter is safe while she's at school gives me peace of mind I didn't know I needed. GuardianSense just works.",
    author: "Priya M.",
    role: "Parent of two",
  },
];

const quote = quotes[0];

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white">

      {/* ── Left — form panel ───────────────────────────────────── */}
      <div className="relative flex w-full flex-col bg-white px-8 py-10 dark:bg-neutral-950 md:w-[460px] md:shrink-0 md:px-12">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 self-start">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 shadow-[0_1px_2px_rgba(16,185,129,0.4)]">
            <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
          </div>
          <span className="text-[14px] font-semibold tracking-[-0.01em] text-neutral-900 dark:text-white">GuardianSense</span>
        </Link>

        {/* Form — vertically centred */}
        <div className="flex flex-1 items-center justify-center">
          <LoginForm />
        </div>
      </div>

      {/* ── Right — quote panel ─────────────────────────────────── */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden border-l border-white/[0.06] bg-neutral-900 p-12 md:flex">

        {/* Subtle grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,#fff 0px,transparent 1px,transparent 60px,#fff 60px),repeating-linear-gradient(90deg,#fff 0px,transparent 1px,transparent 60px,#fff 60px)",
          }}
        />

        {/* Emerald glow */}
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-20 left-1/3 h-72 w-72 rounded-full bg-emerald-500/5 blur-3xl" />

        {/* Feature pill */}
        <div className="relative self-start rounded-full border border-white/[0.07] bg-white/[0.04] px-3.5 py-1.5 text-[12px] text-neutral-400">
          Real-time tracking · Zone alerts · Telegram push
        </div>

        {/* Quote */}
        <div className="relative">
          <div className="mb-6 text-[72px] leading-none text-emerald-500/40 select-none">&ldquo;</div>
          <blockquote className="text-[22px] font-medium leading-[1.45] tracking-[-0.01em] text-white">
            {quote!.text}
          </blockquote>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-[13px] font-bold text-emerald-300">
              {quote!.author.charAt(0)}
            </div>
            <div>
              <p className="text-[13px] font-medium text-white">{quote!.author}</p>
              <p className="text-[12px] text-neutral-500">{quote!.role}</p>
            </div>
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative flex items-center gap-8 border-t border-white/[0.06] pt-6">
          {[
            { value: "< 5s", label: "Alert delivery" },
            { value: "99.9%", label: "Uptime" },
            { value: "3 steps", label: "To get started" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-[18px] font-semibold text-white">{s.value}</p>
              <p className="text-[11.5px] text-neutral-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
