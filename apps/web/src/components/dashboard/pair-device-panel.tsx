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
  if (error instanceof Error) {
    return error.message;
  }

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
          Authorization: `Bearer ${firebaseToken}`
        },
        body: JSON.stringify(
          mode === "existing-child"
            ? { childId: selectedChildId }
            : { childName: childName.trim() }
        )
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create pairing code.");
      }

      setPairingResult(data satisfies PairingCodeResponse);
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,28,23,0.96),rgba(7,13,11,0.98))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-300/90">
          Child Access Approval
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
          Add a child device or approve a return to the platform.
        </h2>
        <p className="max-w-2xl text-sm leading-7 text-slate-300/75">
          Use one-time codes both for first-time pairing and for letting an existing child
          sign back in after logging out or reinstalling the app.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            mode === "new-child"
              ? "border-emerald-300/70 bg-emerald-300 text-slate-950 shadow-[0_12px_30px_rgba(110,231,183,0.25)]"
              : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/8"
          }`}
          onClick={() => setMode("new-child")}
          type="button"
        >
          New child
        </button>
        <button
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            mode === "existing-child"
              ? "border-emerald-300/70 bg-emerald-300 text-slate-950 shadow-[0_12px_30px_rgba(110,231,183,0.25)]"
              : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/8"
          }`}
          onClick={() => setMode("existing-child")}
          type="button"
        >
          Existing child re-login
        </button>
      </div>

      <form className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]" onSubmit={handleCreatePairingCode}>
        {mode === "new-child" ? (
          <label className="grid gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              New child name
            </span>
            <input
              className="w-full rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-emerald-300/50 focus:bg-black/30"
              onChange={(event) => setChildName(event.target.value)}
              placeholder="Ashhar"
              type="text"
              value={childName}
            />
          </label>
        ) : (
          <label className="grid gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Existing child
            </span>
            <select
              className="w-full rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-slate-50 outline-none transition focus:border-emerald-300/50 focus:bg-black/30"
              onChange={(event) => setSelectedChildId(event.target.value)}
              value={selectedChildId}
            >
              <option value="">
                {children.length === 0 ? "No children available yet" : "Select a child"}
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
          className="rounded-[22px] border border-emerald-300/70 bg-emerald-300 px-5 py-3 font-medium text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading || (mode === "existing-child" && children.length === 0)}
          type="submit"
        >
          {loading
            ? "Generating..."
            : mode === "existing-child"
              ? "Create re-login code"
              : "Create pairing code"}
        </button>
      </form>

      {error ? (
        <p className="mt-4 rounded-[22px] border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {pairingResult ? (
        <div className="mt-5 rounded-[24px] border border-emerald-300/25 bg-[linear-gradient(180deg,rgba(110,231,183,0.14),rgba(16,185,129,0.08))] p-5">
          <p className="text-sm text-emerald-100/90">
            {pairingResult.mode === "existing-child"
              ? `Re-login code ${pairingResult.reused ? "reused" : "created"} for ${pairingResult.childName}.`
              : `Pairing code ${pairingResult.reused ? "reused" : "created"} for ${pairingResult.childName}.`}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-[0.28em] text-white">
            {pairingResult.code}
          </p>
          <p className="mt-2 text-sm text-emerald-100/80">
            Expires at {new Date(pairingResult.expiresAt).toLocaleString()}.
          </p>
        </div>
      ) : null}
    </section>
  );
}
