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
  const firstSegment = placeName
    .split(",")[0]
    ?.trim();

  if (!firstSegment) {
    return "";
  }

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
      const response = await fetch(`/api/places/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to search places.");
      }

      setResults(data as PlaceSearchResult[]);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function handleCreateSafeZone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedResult) {
      setError("Select a place result before saving a safe zone.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const trimmedLabel = label.trim();
      const geofenceLabel = (trimmedLabel || buildSafeZoneLabel(selectedResult.displayName))
        .slice(0, MAX_SAFE_ZONE_LABEL_LENGTH);

      if (!geofenceLabel) {
        throw new Error("Add a short label for this safe zone.");
      }

      const response = await fetch("/api/geofences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label: geofenceLabel,
          severity,
          centerLatitude: selectedResult.latitude,
          centerLongitude: selectedResult.longitude,
          radiusMeters: Number(radiusMeters),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        const validationMessage = Array.isArray(data.issues)
          ? data.issues
              .map((issue: { message?: string }) => issue.message)
              .filter(Boolean)
              .join(" ")
          : null;

        throw new Error(
          validationMessage || data.error || "Failed to create safe zone.",
        );
      }

      setSafeZones((currentZones) => [data as SafeZone, ...currentZones]);
      setLabel("");
      setQuery("");
      setResults([]);
      setSelectedResult(null);
      setRadiusMeters("150");
      setSeverity("safe");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-slate-200/60 bg-white/70 p-6 shadow-[0_26px_80px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,28,23,0.96),rgba(7,13,11,0.98))] dark:shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-300/90">
          Zones
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">
          Search a place and mark it as safe, caution, or danger.
        </h2>
        <p className="max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-300/75">
          This uses OpenStreetMap&apos;s Nominatim search for now, so you can type places
          naturally like home, school, a busy road, or any place the parent wants to classify.
        </p>
      </div>

      <form className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_180px]" onSubmit={handleSearch}>
        <label className="grid gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Place search
          </span>
          <input
            className="w-full rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 dark:border-white/10 dark:bg-black/20 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-emerald-300/50 dark:focus:bg-black/30 dark:focus:ring-0"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for a place"
            type="text"
            value={query}
          />
        </label>
        <button
          className="rounded-[22px] border border-slate-200 bg-slate-100 px-5 py-3 font-medium text-slate-900 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/90 dark:text-slate-950 dark:hover:bg-white"
          disabled={searching}
          type="submit"
        >
          {searching ? "Searching..." : "Search place"}
        </button>
      </form>

      {results.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {results.map((result) => (
            <button
              className={`rounded-[22px] border px-4 py-4 text-left text-sm transition ${
                selectedResult?.id === result.id
                  ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-100 shadow-[0_12px_30px_rgba(110,231,183,0.08)]"
                  : "border-white/10 bg-black/20 text-slate-300 hover:bg-white/6"
              }`}
              key={result.id}
              onClick={() => {
                setSelectedResult(result);
                setLabel(buildSafeZoneLabel(result.displayName));
              }}
              type="button"
            >
              <p className="font-medium text-white">{result.displayName}</p>
              <p className="mt-1 text-xs text-slate-400">
                {result.latitude.toFixed(6)}, {result.longitude.toFixed(6)}
              </p>
            </button>
          ))}
        </div>
      ) : null}

      <form className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_0.8fr_0.7fr_220px]" onSubmit={handleCreateSafeZone}>
        <label className="grid gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Zone label
          </span>
          <input
            className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 dark:border-white/10 dark:bg-black/20 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-emerald-300/50 dark:focus:bg-black/30 dark:focus:ring-0"
            maxLength={MAX_SAFE_ZONE_LABEL_LENGTH}
            onChange={(event) =>
              setLabel(event.target.value.slice(0, MAX_SAFE_ZONE_LABEL_LENGTH))
            }
            placeholder="Home"
            type="text"
            value={label}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Severity
          </span>
          <select
            className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-slate-50 outline-none transition focus:border-emerald-300/50 focus:bg-black/30"
            onChange={(event) => setSeverity(event.target.value as SafeZone["severity"])}
            value={severity}
          >
            <option value="safe">Safe</option>
            <option value="caution">Caution</option>
            <option value="danger">Danger</option>
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Radius
          </span>
          <input
            className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 dark:border-white/10 dark:bg-black/20 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-emerald-300/50 dark:focus:bg-black/30 dark:focus:ring-0"
            min="25"
            onChange={(event) => setRadiusMeters(event.target.value)}
            placeholder="150"
            type="number"
            value={radiusMeters}
          />
        </label>
        <button
          className="rounded-[22px] border border-emerald-300/70 bg-emerald-300 px-5 py-3 font-medium text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving || !selectedResult}
          type="submit"
        >
          {saving ? "Saving..." : "Save zone"}
        </button>
      </form>

      {error ? (
        <p className="mt-4 rounded-[22px] border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <p className="mt-3 text-xs text-slate-500">
        Short labels like Home, School, Highway, or River Bank work best.
      </p>

      <div className="mt-6 space-y-3">
        {safeZones.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-slate-400">
            No zones saved yet.
          </div>
        ) : (
          safeZones.map((zone) => (
            <article
              className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4"
              key={zone.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium text-white">{zone.label}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {zone.centerLatitude.toFixed(6)}, {zone.centerLongitude.toFixed(6)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={getSeverityBadgeClassName(zone.severity)}>
                    {zone.severity}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-200">
                    {Math.round(zone.radiusMeters)} m
                  </span>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function getSeverityBadgeClassName(severity: SafeZone["severity"]) {
  switch (severity) {
    case "danger":
      return "rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200";
    case "caution":
      return "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200";
    case "safe":
    default:
      return "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-500/10 dark:text-emerald-200";
  }
}
