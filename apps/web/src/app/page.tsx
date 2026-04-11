import { AuthPanel } from "@/components/auth/auth-panel";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-20 text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">
            GuardianSense V1
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-balance">
            The new parent platform is wired for Supabase clients and typed backend infrastructure.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-300">
            Supabase URL and anon key are now configured as the app-facing integration layer, while
            the direct database connection remains reserved for Drizzle, pg, and migrations.
          </p>
        </div>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-medium text-slate-100">Environment Split</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <li>`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` power Supabase clients.</li>
              <li>`DATABASE_URL` stays server-only for direct Postgres tooling.</li>
              <li>The web app now has reusable server and browser Supabase helpers.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-medium text-slate-100">Current Auth State</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              {user
                ? `Supabase session detected for ${user.email ?? "an authenticated user"}.`
                : "No Supabase user session is active yet. Auth UI will come next."}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <AuthPanel />

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-medium text-slate-100">What To Expect</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <li>Use Firebase email/password auth to create or sign in a parent.</li>
              <li>The page requests a Firebase ID token from the client SDK.</li>
              <li>The protected route verifies that token with Firebase Admin.</li>
              <li>The backend provisions `users` and `parents` rows automatically if needed.</li>
              <li>A short-lived child pairing code is then stored in Postgres.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
