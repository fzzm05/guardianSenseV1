import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200/70 bg-white dark:border-white/[0.06] dark:bg-neutral-950">

      {/* ── Top section ─────────────────────────────────────────── */}
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-5 pb-0 pt-16 sm:grid-cols-[1fr_auto]">

        {/* Left tagline */}
        <p className="text-[22px] font-semibold tracking-[-0.02em] text-neutral-900 dark:text-white sm:text-[26px]">
          Keep your family safe.
        </p>

        {/* Right link columns */}
        <div className="flex gap-16 text-[13px]">
          <div className="flex flex-col gap-3">
            <Link href="/signup" className="text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white">Get started</Link>
            <Link href="/login" className="text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white">Sign in</Link>
            <a href="#download" className="text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white">Download app</a>
            <a href="#features" className="text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white">Features</a>
            <a href="#how-it-works" className="text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white">How it works</a>
          </div>
          <div className="flex flex-col gap-3">
            <a href="#" className="text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white">Privacy policy</a>
            <a href="#" className="text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white">Terms of service</a>
            <a href="#" className="text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white">Contact</a>
          </div>
        </div>
      </div>

      {/* ── Giant brand name ─────────────────────────────────────── */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox="0 0 1000 110"
          width="100%"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="block fill-neutral-900 dark:fill-white"
          style={{ height: "clamp(3rem, 12vw, 12rem)" }}
        >
          <text
            x="0"
            y="100"
            textLength="1000"
            lengthAdjust="spacingAndGlyphs"
            fontWeight="900"
            fontFamily="inherit"
            fontSize="110"
            letterSpacing="-4"
          >
            GuardianSense
          </text>
        </svg>
      </div>

      {/* ── Bottom bar ───────────────────────────────────────────── */}
      <div className="mx-auto flex max-w-[1200px] items-center justify-between border-t border-neutral-100 px-5 py-4 dark:border-white/[0.05]">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500">
            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
          </div>
          <span className="text-[12px] font-medium text-neutral-500 dark:text-neutral-500">GuardianSense</span>
        </div>

        <div className="flex items-center gap-5 text-[12px] text-neutral-400 dark:text-neutral-600">
          <span>© {new Date().getFullYear()}</span>
          <a href="#" className="hover:text-neutral-700 dark:hover:text-neutral-400">Privacy</a>
          <a href="#" className="hover:text-neutral-700 dark:hover:text-neutral-400">Terms</a>
        </div>
      </div>
    </footer>
  );
}
