"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase/client";

type Mode = "login" | "signup";

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;

    if (typeof maybeMessage === "string") {
      return maybeMessage;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

export function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const auth = getFirebaseAuth();
      const credentials =
        mode === "signup"
          ? await createUserWithEmailAndPassword(auth, email, password)
          : await signInWithEmailAndPassword(auth, email, password);

      const idToken = await credentials.user.getIdToken();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const sessionResponse = await fetch("/api/session/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ idToken, timezone })
      });

      const sessionData = await sessionResponse.json();

      if (!sessionResponse.ok) {
        throw new Error(sessionData.error ?? "Failed to establish session.");
      }

      router.push("/dashboard");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex items-center gap-3">
        <button
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            mode === "signup"
              ? "bg-sky-400 text-slate-950"
              : "bg-slate-800 text-slate-300"
          }`}
          onClick={() => setMode("signup")}
          type="button"
        >
          Sign up
        </button>
        <button
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            mode === "login"
              ? "bg-sky-400 text-slate-950"
              : "bg-slate-800 text-slate-300"
          }`}
          onClick={() => setMode("login")}
          type="button"
        >
          Log in
        </button>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm text-slate-300" htmlFor="email">
            Email
          </label>
          <input
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-50 outline-none ring-0 placeholder:text-slate-500"
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="parent@example.com"
            type="email"
            value={email}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-300" htmlFor="password">
            Password
          </label>
          <input
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-50 outline-none ring-0 placeholder:text-slate-500"
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 6 characters"
            type="password"
            value={password}
          />
        </div>

        <button
          className="w-full rounded-2xl bg-sky-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading
            ? "Working..."
            : mode === "signup"
              ? "Create account"
              : "Log in"}
        </button>
      </form>

      {error ? (
        <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
