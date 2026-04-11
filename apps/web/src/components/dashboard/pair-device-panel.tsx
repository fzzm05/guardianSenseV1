"use client";

import { useState } from "react";

import { getFirebaseAuth } from "@/lib/firebase/client";

type ExistingChild = {
  id: string;
  displayName: string;
};

type PairDevicePanelProps = {
  idToken?: string;
  children: ExistingChild[];
};

type PairingCodeResponse = {
  code: string;
  expiresAt: string;
  reused: boolean;
  childId: string | null;
  childName: string;
  mode: "new-child" | "existing-child";
};

type PairingMode = "new-child" | "existing-child";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

export function PairDevicePanel({ idToken, children }: PairDevicePanelProps) {
  const [mode, setMode] = useState<PairingMode>("new-child");
  const [childName, setChildName] = useState("");
  const [selectedChildId, setSelectedChildId] = useState<string>(children[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairingResult, setPairingResult] = useState<PairingCodeResponse | null>(null);

  async function handleCreatePairingCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "new-child" && !childName.trim()) {
        throw new Error("Please enter a child name before creating a pairing code.");
      }
      if (mode === "existing-child" && !selectedChildId) {
        throw new Error("Choose a child before generating a re-login code.");
      }

      const auth = getFirebaseAuth();
      const firebaseToken =
        idToken ?? (auth.currentUser ? await auth.currentUser.getIdToken() : null);

      if (!firebaseToken) {
        throw new Error("You must be signed in to generate a pairing code.");
      }

      const response = await fetch("/api/pairing-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify(
          mode === "existing-child"
            ? { childId: selectedChildId }
            : { childName: childName.trim() },
        ),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to create pairing code.");

      setPairingResult(data satisfies PairingCodeResponse);
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-neutral-200/80 bg-white dark:border-white/[0.07] dark:bg-neutral-900">

      {/* Header */}
      <div className="border-b border-neutral-100 px-4 py-4 dark:border-white/[0.05]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-400/10">
            <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" />
              <path d="M12 18h.01" />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-neutral-900 dark:text-white">
              Pair a device
            </p>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-600">
              New child or existing re-login
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">

        {/* Mode tabs */}
        <div className="mb-4 flex gap-1.5 rounded-lg border border-neutral-200/80 bg-neutral-50 p-1 dark:border-white/[0.07] dark:bg-neutral-800/50">
          {(["new-child", "existing-child"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setPairingResult(null); setError(null); }}
              className={[
                "flex-1 rounded-md py-1.5 text-[12.5px] font-medium transition-all duration-100",
                mode === m
                  ? "bg-white text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_0_0_0.5px_rgba(0,0,0,0.05)] dark:bg-neutral-700 dark:text-white dark:shadow-none"
                  : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300",
              ].join(" ")}
            >
              {m === "new-child" ? "New child" : "Re-login"}
            </button>
          ))}
        </div>

        {/* Description */}
        <p className="mb-4 text-[12px] leading-relaxed text-neutral-500 dark:text-neutral-500">
          {mode === "new-child"
            ? "Create a one-time pairing code to add a new child's device to your account."
            : "Generate a re-login code for an existing child who has logged out or reinstalled the app."}
        </p>

        {/* Form */}
        <form className="space-y-3" onSubmit={handleCreatePairingCode}>
          {mode === "new-child" ? (
            <label className="block">
              <span className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-600">
                Child name
              </span>
              <input
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="e.g. Aanya"
                className="w-full rounded-lg border border-neutral-200/80 bg-white px-3 py-2.5 text-[13px] text-neutral-900 outline-none placeholder:text-neutral-400 transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-white/[0.07] dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:border-white/20 dark:focus:ring-white/[0.06]"
              />
            </label>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-600">
                Select child
              </span>
              <select
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="w-full rounded-lg border border-neutral-200/80 bg-white px-3 py-2.5 text-[13px] text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-white/[0.07] dark:bg-neutral-800 dark:text-white dark:focus:border-white/20 dark:focus:ring-white/[0.06]"
              >
                <option value="">
                  {children.length === 0 ? "No children available yet" : "Select a child…"}
                </option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.displayName}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            type="submit"
            disabled={loading || (mode === "existing-child" && children.length === 0)}
            className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08] dark:text-emerald-300 dark:hover:bg-emerald-500/[0.12]"
          >
            {loading
              ? "Generating…"
              : mode === "existing-child"
                ? "Create re-login code"
                : "Create pairing code"}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-500/25 dark:bg-red-500/[0.08]">
            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <p className="text-[12px] text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Pairing result */}
        {pairingResult && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08]">
            <p className="text-[11.5px] text-emerald-700 dark:text-emerald-400">
              {pairingResult.mode === "existing-child"
                ? `Re-login code ${pairingResult.reused ? "reused" : "created"} for ${pairingResult.childName}.`
                : `Pairing code ${pairingResult.reused ? "reused" : "created"} for ${pairingResult.childName}.`}
            </p>

            {/* Code display */}
            <div className="my-3 flex items-center justify-center rounded-lg border border-emerald-200/80 bg-white py-4 dark:border-emerald-500/20 dark:bg-emerald-900/20">
              <span className="font-mono text-3xl font-semibold tracking-[0.3em] text-neutral-900 dark:text-white">
                {pairingResult.code}
              </span>
            </div>

            <p className="text-[11px] text-emerald-600 dark:text-emerald-500">
              Expires {new Date(pairingResult.expiresAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}