"use client";

import { useState } from "react";

const MAX_SAFE_ZONE_LABEL_LENGTH = 120;

type PlaceSearchResult = {
  id: string;
  displayName: string;
  latitude: number;
  longitude: number;
};

export type SafeZone = {
  id: string;
  label: string;
  severity: "safe" | "caution" | "danger";
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type SafeZonesPanelProps = {
  initialSafeZones: SafeZone[];
};

function buildSafeZoneLabel(placeName: string) {
  const firstSegment = placeName.split(",")[0]?.trim();
  if (!firstSegment) return "";
  return firstSegment.slice(0, MAX_SAFE_ZONE_LABEL_LENGTH);
}

export function SafeZonesPanel({ initialSafeZones }: SafeZonesPanelProps) {
  const [query, setQuery] = useState("");
  const [label, setLabel] = useState("");
  const [severity, setSeverity] = useState<SafeZone["severity"]>("safe");
  const [radiusMeters, setRadiusMeters] = useState("150");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<PlaceSearchResult | null>(null);
  const [safeZones, setSafeZones] = useState(initialSafeZones);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearching(true);
    setError(null);
    setSelectedResult(null);
    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to search places.");
      setResults(data as PlaceSearchResult[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function handleCreateSafeZone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedResult) { setError("Select a place result before saving a safe zone."); return; }
    setSaving(true);
    setError(null);
    try {
      const trimmedLabel = label.trim();
      const geofenceLabel = (trimmedLabel || buildSafeZoneLabel(selectedResult.displayName)).slice(0, MAX_SAFE_ZONE_LABEL_LENGTH);
      if (!geofenceLabel) throw new Error("Add a short label for this safe zone.");
      const res = await fetch("/api/geofences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: geofenceLabel, severity, centerLatitude: selectedResult.latitude, centerLongitude: selectedResult.longitude, radiusMeters: Number(radiusMeters) }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.issues) ? data.issues.map((i: { message?: string }) => i.message).filter(Boolean).join(" ") : null;
        throw new Error(msg || data.error || "Failed to create safe zone.");
      }
      setSafeZones((cur) => [data as SafeZone, ...cur]);
      setLabel(""); setQuery(""); setResults([]); setSelectedResult(null); setRadiusMeters("150"); setSeverity("safe");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col">

      {/* Panel top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-white/[0.05]">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-600">
            Zones
          </p>
          <p className="mt-0.5 text-[13px] font-medium text-neutral-900 dark:text-white">
            Search a place and classify it
          </p>
        </div>
        <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-500 dark:border-white/[0.07] dark:bg-neutral-800 dark:text-neutral-400">
          {safeZones.length} {safeZones.length === 1 ? "zone" : "zones"}
        </span>
      </div>

      {/* Search + create form area */}
      <div className="border-b border-neutral-100 px-5 py-4 dark:border-white/[0.05]">

        {/* Hint */}
        <p className="mb-4 text-[12px] text-neutral-400 dark:text-neutral-600">
          Search with natural names — home, school, a busy road. Uses OpenStreetMap Nominatim.
        </p>

        {/* Place search */}
        <form className="flex gap-2" onSubmit={handleSearch}>
          <label className="flex-1">
            <span className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-600">
              Place search
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a place…"
              className="w-full rounded-lg border border-neutral-200/80 bg-white px-3 py-2.5 text-[13px] text-neutral-900 outline-none placeholder:text-neutral-400 transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-white/[0.07] dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:border-white/20 dark:focus:ring-white/[0.06]"
            />
          </label>
          <div className="flex flex-col justify-end">
            <button
              type="submit"
              disabled={searching}
              className="rounded-lg border border-neutral-200/80 bg-white px-4 py-2.5 text-[13px] font-medium text-neutral-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:bg-neutral-50 hover:border-neutral-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.07] dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              {searching ? "Searching…" : "Search"}
            </button>
          </div>
        </form>

        {/* Search results */}
        {results.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {results.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => { setSelectedResult(result); setLabel(buildSafeZoneLabel(result.displayName)); }}
                className={[
                  "w-full rounded-lg border px-3 py-2.5 text-left transition-all duration-100",
                  selectedResult?.id === result.id
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08]"
                    : "border-neutral-200/80 bg-white hover:border-neutral-300 hover:bg-neutral-50 dark:border-white/[0.07] dark:bg-transparent dark:hover:bg-white/[0.03]",
                ].join(" ")}
              >
                <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                  {result.displayName}
                </p>
                <p className="mt-0.5 font-mono text-[10.5px] text-neutral-400 dark:text-neutral-600">
                  {result.latitude.toFixed(6)}, {result.longitude.toFixed(6)}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Zone creation form */}
        <form className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-[minmax(0,1.2fr)_0.8fr_0.7fr_auto]" onSubmit={handleCreateSafeZone}>
          <label className="block">
            <span className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-600">
              Zone label
            </span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value.slice(0, MAX_SAFE_ZONE_LABEL_LENGTH))}
              maxLength={MAX_SAFE_ZONE_LABEL_LENGTH}
              placeholder="Home"
              className="w-full rounded-lg border border-neutral-200/80 bg-white px-3 py-2.5 text-[13px] text-neutral-900 outline-none placeholder:text-neutral-400 transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-white/[0.07] dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:border-white/20 dark:focus:ring-white/[0.06]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-600">
              Severity
            </span>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as SafeZone["severity"])}
              className="w-full rounded-lg border border-neutral-200/80 bg-white px-3 py-2.5 text-[13px] text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-white/[0.07] dark:bg-neutral-800 dark:text-white dark:focus:border-white/20 dark:focus:ring-white/[0.06]"
            >
              <option value="safe">Safe</option>
              <option value="caution">Caution</option>
              <option value="danger">Danger</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-600">
              Radius (m)
            </span>
            <input
              type="number"
              value={radiusMeters}
              min="25"
              onChange={(e) => setRadiusMeters(e.target.value)}
              placeholder="150"
              className="w-full rounded-lg border border-neutral-200/80 bg-white px-3 py-2.5 text-[13px] text-neutral-900 outline-none placeholder:text-neutral-400 transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-white/[0.07] dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:border-white/20 dark:focus:ring-white/[0.06]"
            />
          </label>

          <div className="flex flex-col justify-end col-span-2 xl:col-span-1">
            <button
              type="submit"
              disabled={saving || !selectedResult}
              className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08] dark:text-emerald-300 dark:hover:bg-emerald-500/[0.12]"
            >
              {saving ? "Saving…" : "Save zone"}
            </button>
          </div>
        </form>

        {/* Hint text */}
        <p className="mt-2.5 text-[11px] text-neutral-400 dark:text-neutral-600">
          Short labels like Home, School, Highway, or River Bank work best.
        </p>

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
      </div>

      {/* Zone list */}
      <div className="flex-1 overflow-y-auto">
        {safeZones.length === 0 ? (
          <div className="px-5 py-8 text-center text-[12.5px] text-neutral-400 dark:text-neutral-600">
            No zones saved yet. Search a place above to get started.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-white/[0.05]">
            {safeZones.map((zone) => (
              <article key={zone.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Severity dot */}
                  <div className={[
                    "h-2 w-2 shrink-0 rounded-full",
                    zone.severity === "safe" ? "bg-emerald-500"
                    : zone.severity === "caution" ? "bg-amber-400"
                    : "bg-red-500",
                  ].join(" ")} />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                      {zone.label}
                    </p>
                    <p className="font-mono text-[10.5px] text-neutral-400 dark:text-neutral-600">
                      {zone.centerLatitude.toFixed(6)}, {zone.centerLongitude.toFixed(6)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className={getSeverityTagClass(zone.severity)}>
                    {zone.severity}
                  </span>
                  <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10.5px] font-medium text-neutral-500 dark:border-white/[0.07] dark:bg-neutral-800 dark:text-neutral-500">
                    {Math.round(zone.radiusMeters)} m
                  </span>
                  <span className={[
                    "rounded-full border px-2 py-0.5 text-[10.5px] font-medium",
                    zone.isActive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08] dark:text-emerald-400"
                      : "border-neutral-200 bg-neutral-50 text-neutral-400 dark:border-white/[0.07] dark:bg-neutral-800 dark:text-neutral-600",
                  ].join(" ")}>
                    {zone.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSeverityTagClass(severity: SafeZone["severity"]) {
  switch (severity) {
    case "danger":
      return "rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10.5px] font-medium capitalize text-red-700 dark:border-red-500/25 dark:bg-red-500/[0.08] dark:text-red-400";
    case "caution":
      return "rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-medium capitalize text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/[0.08] dark:text-amber-400";
    case "safe":
    default:
      return "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-medium capitalize text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08] dark:text-emerald-400";
  }
}