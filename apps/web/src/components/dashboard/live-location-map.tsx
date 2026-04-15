"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState, type MutableRefObject } from "react";

import { loadGoogleMapsLibrary } from "@/lib/google-maps";

type ChildSummary = {
  id: string;
  displayName: string;
  status: string;
  platform: string | null;
  deviceName: string | null;
  currentZoneLabel: string | null;
  deviceLastSeenAt: string | null;
  appVersion: string | null;
  osVersion: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastAccuracyMeters: number | null;
  lastRecordedAt: string | null;
  batteryLevel: number | null;
  isCharging: boolean | null;
  networkType: string | null;
  speedMetersPerSecond: number | null;
  locationSource: string | null;
};

type SafeZone = {
  id: string;
  label: string;
  severity: "safe" | "caution" | "danger";
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  isActive: boolean;
};

export type RouteHistoryPoint = {
  id: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  speedMetersPerSecond: number | null;
  batteryLevel: number | null;
  isCharging: boolean | null;
  networkType: string | null;
  source: string;
  recordedAt: string;
};

type LiveLocationMapProps = {
  childList: ChildSummary[];
  safeZones: SafeZone[];
  selectedChild: ChildSummary | null;
  selectedChildId?: string | null;
  selectedChildFocusKey: string;
  routeHistory: RouteHistoryPoint[];
  routeHistoryHours: number;
  routeHistoryLoading?: boolean;
  viewportKey: string;
};

// ─── Map styles ───────────────────────────────────────────────────────────────

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6e7681" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#8b949e" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6e7681" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#161b22" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#3d444d" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#21262d" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#161b22" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6e7681" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#30363d" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#161b22" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#8b949e" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#161b22" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#6e7681" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d444d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#0d1117" }] },
];

const LIGHT_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f6f8fa" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#57606a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#d0d7de" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#6e7781" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#24292f" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#57606a" }] },
  { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#e6f4ea" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#57606a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#eaeef2" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#d0d7de" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#57606a" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#6e7781" }] },
  { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#6e7781" }] },
  { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#d0d7de" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#ddf4ff" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#57606a" }] },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function LiveLocationMap({
  childList,
  safeZones,
  selectedChild,
  selectedChildId,
  selectedChildFocusKey,
  routeHistory,
  routeHistoryHours,
  routeHistoryLoading = false,
  viewportKey,
}: LiveLocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const { resolvedTheme } = useTheme();

  const popupRef = useRef<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<google.maps.OverlayView[]>([]);
  const safeZonesRef = useRef<google.maps.Circle[]>([]);
  const routeLineRef = useRef<google.maps.Polyline | null>(null);
  const routePointsRef = useRef<google.maps.Marker[]>([]);
  const routePointZoomListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const lastAppliedViewportKeyRef = useRef<string | null>(null);
  const lastFocusedChildKeyRef = useRef<string | null>(null);

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initMap = async () => {
      const { Map, InfoWindow } = await loadGoogleMapsLibrary("maps");
      if (!containerRef.current) return;

      const map = new Map(containerRef.current, {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        disableDefaultUI: true,
        backgroundColor: resolvedTheme === "dark" ? "#0d1117" : "#f6f8fa",
        styles: resolvedTheme === "dark" ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
      });

      mapRef.current = map;
      popupRef.current = new InfoWindow({ disableAutoPan: true });

      map.addListener("click", () => { popupRef.current?.close(); });
      setIsMapReady(true);
    };

    void initMap();

    return () => {
      popupRef.current?.close();
      
      // Capture ref values for safe cleanup
      const markers = markersRef.current;
      const safeZones = safeZonesRef.current;
      const routeLine = routeLineRef.current;
      const routePoints = routePointsRef.current;

      markers.forEach((m) => m.setMap(null));
      safeZones.forEach((z) => z.setMap(null));
      if (routeLine) routeLine.setMap(null);
      routePoints.forEach((p) => p.setMap(null));

      routePointZoomListenerRef.current?.remove();
      routePointZoomListenerRef.current = null;
      mapRef.current = null;
    };
  }, [resolvedTheme]);

  // ── Theme sync ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setOptions({
      backgroundColor: resolvedTheme === "dark" ? "#0d1117" : "#f6f8fa",
      styles: resolvedTheme === "dark" ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
    });
  }, [resolvedTheme]);

  // ── Layer sync ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;
    syncSafeZoneLayers(map, safeZones, safeZonesRef);
    syncRouteLayers(map, routeHistory, routeLineRef, routePointsRef, popupRef, routePointZoomListenerRef);
    syncCurrentMarkers(map, markersRef, popupRef, childList, selectedChildId);
  }, [childList, routeHistory, safeZones, selectedChildId, isMapReady]);

  // ── Viewport key ────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;
    if (lastAppliedViewportKeyRef.current === viewportKey) return;
    fitMapToData({ map, children: childList, routeHistory, safeZones, selectedChild });
    lastAppliedViewportKeyRef.current = viewportKey;
  }, [childList, routeHistory, safeZones, selectedChild, viewportKey, isMapReady]);

  // ── Focus key ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;
    if (lastFocusedChildKeyRef.current === selectedChildFocusKey) return;

    if (!selectedChild || selectedChild.lastLatitude == null || selectedChild.lastLongitude == null) {
      fitMapToData({ map, children: childList, routeHistory, safeZones, selectedChild: null });
      lastFocusedChildKeyRef.current = selectedChildFocusKey;
      return;
    }

    map.panTo({ lat: selectedChild.lastLatitude, lng: selectedChild.lastLongitude });
    map.setZoom(15.5);
    lastFocusedChildKeyRef.current = selectedChildFocusKey;
  }, [selectedChildFocusKey, selectedChild, childList, routeHistory, safeZones, isMapReady]);

  // ── Selected child detail rows ───────────────────────────────────────────────
  const selectedChildDetails = selectedChild
    ? [
        { label: "Zone", value: selectedChild.currentZoneLabel ?? "Outside known zones" },
        { label: "Battery", value: formatBatteryLevel(selectedChild.batteryLevel) },
        { label: "Speed", value: formatSpeed(selectedChild.speedMetersPerSecond) },
        { label: "Updated", value: formatDateTime(selectedChild.lastRecordedAt) },
      ]
    : [];

  return (
    <div className="flex h-full flex-col bg-neutral-50 dark:bg-neutral-950">

      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200/70 bg-white px-4 py-2.5 dark:border-white/[0.06] dark:bg-neutral-950">
        <div className="flex items-center gap-2">
          {/* Map pin icon */}
          <svg className="h-3.5 w-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Zm0-7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          </svg>
          <span className="text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
            {selectedChild ? selectedChild.displayName : "Live map"}
          </span>
          {selectedChild && (
            <span className="text-[11.5px] text-neutral-400 dark:text-neutral-600">
              — {selectedChild.currentZoneLabel ?? "Outside known zones"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Route loading indicator */}
          {routeHistoryLoading && (
            <span className="text-[11px] text-neutral-400 dark:text-neutral-600">
              Loading route…
            </span>
          )}
          {!routeHistoryLoading && routeHistory.length > 0 && (
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10.5px] font-medium text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/[0.08] dark:text-sky-400">
              {routeHistory.length} pts · {routeHistoryHours}h
            </span>
          )}
          {selectedChild && (
            <span className={[
              "rounded-full border px-2 py-0.5 text-[10.5px] font-medium capitalize",
              selectedChild.status === "safe"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08] dark:text-emerald-400"
                : selectedChild.status === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/[0.08] dark:text-amber-400"
                  : selectedChild.status === "danger"
                    ? "border-red-200 bg-red-50 text-red-600 dark:border-red-500/25 dark:bg-red-500/[0.08] dark:text-red-400"
                    : "border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-white/[0.07] dark:bg-neutral-800 dark:text-neutral-500",
            ].join(" ")}>
              {selectedChild.status}
            </span>
          )}
        </div>
      </div>

      {/* Map + overlays */}
      <div className="relative min-h-0 flex-1">

        {/* Selected child info card — top left */}
        <div className="absolute left-3 top-3 z-10 w-56 rounded-xl border border-neutral-200/80 bg-white/95 p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-sm dark:border-white/[0.08] dark:bg-neutral-900/95">
          {selectedChild ? (
            <>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-600">
                Selected child
              </p>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300">
                  {selectedChild.displayName.trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                    {selectedChild.displayName}
                  </p>
                  <p className="truncate text-[11px] text-neutral-400 dark:text-neutral-600">
                    {selectedChild.deviceName ?? "Unnamed"} · {selectedChild.platform ?? "unknown"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {selectedChildDetails.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-neutral-100 bg-neutral-50 p-2 dark:border-white/[0.05] dark:bg-neutral-800/60"
                  >
                    <p className="text-[9.5px] font-medium uppercase tracking-[0.06em] text-neutral-400 dark:text-neutral-600">
                      {item.label}
                    </p>
                    <p className="mt-1 text-[12px] font-medium text-neutral-800 dark:text-neutral-200">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[12px] leading-relaxed text-neutral-400 dark:text-neutral-600">
              Pair with a child from the GuardianSense mobile app to start tracking their live location here.
            </p>
          )}
        </div>

        {/* Route history card — bottom left, only when children are connected */}
        {childList.length > 0 && (
        <div className="absolute bottom-3 left-3 z-10 w-52 rounded-xl border border-neutral-200/80 bg-white/95 p-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-sm dark:border-white/[0.08] dark:bg-neutral-900/95">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-neutral-400 dark:text-neutral-600">
            Route history
          </p>
          <p className="text-[11.5px] leading-relaxed text-neutral-500 dark:text-neutral-500">
            Last {routeHistoryHours}h · hover dots for details.
          </p>
          <p className="mt-2 text-[11px] text-neutral-400 dark:text-neutral-600">
            {routeHistoryLoading
              ? "Loading…"
              : routeHistory.length > 0
                ? `${routeHistory.length} points loaded`
                : "No points in this window"}
          </p>
        </div>
        )}

        {/* Hint — top right, only when children are connected */}
        {childList.length > 0 && (
        <div className="absolute right-3 top-3 z-10 rounded-lg border border-neutral-200/80 bg-white/95 px-3 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.05)] backdrop-blur-sm dark:border-white/[0.08] dark:bg-neutral-900/95">
          <p className="text-[11px] text-neutral-400 dark:text-neutral-600">
            Click marker for live status
          </p>
        </div>
        )}

        {/* Map canvas */}
        <div className="h-full w-full" ref={containerRef} />
      </div>
    </div>
  );
}

// ─── Layer helpers ────────────────────────────────────────────────────────────

function syncSafeZoneLayers(
  map: google.maps.Map,
  safeZones: SafeZone[],
  safeZonesRef: MutableRefObject<google.maps.Circle[]>,
) {
  safeZonesRef.current.forEach((z) => z.setMap(null));
  safeZonesRef.current = [];

  safeZones.filter((z) => z.isActive).forEach((zone) => {
    const strokeColor =
      zone.severity === "danger" ? "#f87171"
      : zone.severity === "caution" ? "#fbbf24"
      : "#34d399";
    const fillColor =
      zone.severity === "danger" ? "#f87171"
      : zone.severity === "caution" ? "#f59e0b"
      : "#10b981";

    const circle = new google.maps.Circle({
      strokeColor,
      strokeOpacity: 0.7,
      strokeWeight: 1.5,
      fillColor,
      fillOpacity: 0.09,
      map,
      center: { lat: zone.centerLatitude, lng: zone.centerLongitude },
      radius: zone.radiusMeters,
    });

    safeZonesRef.current.push(circle);
  });
}

function syncRouteLayers(
  map: google.maps.Map,
  routeHistory: RouteHistoryPoint[],
  routeLineRef: MutableRefObject<google.maps.Polyline | null>,
  routePointsRef: MutableRefObject<google.maps.Marker[]>,
  popupRef: MutableRefObject<google.maps.InfoWindow | null>,
  routePointZoomListenerRef: MutableRefObject<google.maps.MapsEventListener | null>,
) {
  if (routeLineRef.current) routeLineRef.current.setMap(null);
  routePointsRef.current.forEach((p) => p.setMap(null));
  routePointsRef.current = [];
  routePointZoomListenerRef.current?.remove();
  routePointZoomListenerRef.current = null;

  if (routeHistory.length > 1) {
    routeLineRef.current = new google.maps.Polyline({
      path: routeHistory.map((p) => ({ lat: p.latitude, lng: p.longitude })),
      geodesic: true,
      strokeColor: "#38bdf8",
      strokeOpacity: 0.85,
      strokeWeight: 3,
      map,
    });
  }

  const buildIcon = () => getRoutePointIcon(map.getZoom() ?? 15);

  routeHistory.forEach((point) => {
    const marker = new google.maps.Marker({
      map,
      position: { lat: point.latitude, lng: point.longitude },
      icon: buildIcon(),
      zIndex: 10,
      clickable: true,
      optimized: true,
    });

    marker.addListener("mouseover", () => {
      popupRef.current?.setContent(buildRoutePopupHtml(point));
      popupRef.current?.setPosition({ lat: point.latitude, lng: point.longitude });
      popupRef.current?.open(map);
    });

    marker.addListener("mouseout", () => {
      popupRef.current?.close();
    });

    routePointsRef.current.push(marker);
  });

  routePointZoomListenerRef.current = map.addListener("zoom_changed", () => {
    const icon = buildIcon();
    routePointsRef.current.forEach((m) => m.setIcon(icon));
  });
}

function syncCurrentMarkers(
  map: google.maps.Map,
  markersRef: MutableRefObject<google.maps.OverlayView[]>,
  popupRef: MutableRefObject<google.maps.InfoWindow | null>,
  children: ChildSummary[],
  selectedChildId?: string | null,
) {
  markersRef.current.forEach((m) => m.setMap(null));
  markersRef.current = [];

  const visible = selectedChildId
    ? children.filter((c) => c.id === selectedChildId)
    : children;

  visible
    .filter((c) => c.lastLatitude != null && c.lastLongitude != null)
    .forEach((child) => {
      const isSelected = child.id === selectedChildId;
      const el = document.createElement("div");
      el.className = "guardian-avatar-marker";
      el.innerHTML = buildAvatarMarkup(child.displayName, isSelected);

      const marker = new google.maps.OverlayView();
      const lat = child.lastLatitude as number;
      const lng = child.lastLongitude as number;

      marker.onAdd = function () {
        this.getPanes()?.overlayMouseTarget.appendChild(el);
      };
      marker.draw = function () {
        const proj = this.getProjection();
        if (!proj) return;
        const pt = proj.fromLatLngToDivPixel(new google.maps.LatLng(lat, lng));
        if (pt) {
          el.style.cssText = `position:absolute;left:${pt.x}px;top:${pt.y}px;transform:translate(-50%,-50%);pointer-events:auto;cursor:pointer`;
        }
      };
      marker.onRemove = function () {
        el.parentNode?.removeChild(el);
      };
      marker.setMap(map);

      const popupHtml = buildCurrentStatusPopupHtml(child);
      const open = () => {
        popupRef.current?.close();
        popupRef.current?.setContent(popupHtml);
        popupRef.current?.setPosition({ lat, lng });
        popupRef.current?.open(map);
      };
      el.addEventListener("mouseenter", open);
      el.addEventListener("click", open);

      markersRef.current.push(marker);
    });
}

function fitMapToData({
  map,
  children,
  routeHistory,
  safeZones,
  selectedChild,
}: {
  map: google.maps.Map;
  children: ChildSummary[];
  routeHistory: RouteHistoryPoint[];
  safeZones: SafeZone[];
  selectedChild: ChildSummary | null;
}) {
  const bounds = new google.maps.LatLngBounds();
  let hasPoints = false;

  if (selectedChild != null && routeHistory.length > 0) {
    routeHistory.forEach((p) => { bounds.extend({ lat: p.latitude, lng: p.longitude }); hasPoints = true; });
  } else {
    children.filter((c) => c.lastLatitude != null && c.lastLongitude != null).forEach((c) => {
      bounds.extend({ lat: c.lastLatitude as number, lng: c.lastLongitude as number });
      hasPoints = true;
    });
  }

  safeZones.filter((z) => z.isActive).forEach((zone) => {
    const rLat = zone.radiusMeters / 111320;
    const rLng = zone.radiusMeters / (111320 * Math.max(Math.cos((zone.centerLatitude * Math.PI) / 180), 0.2));
    bounds.extend({ lat: zone.centerLatitude - rLat, lng: zone.centerLongitude - rLng });
    bounds.extend({ lat: zone.centerLatitude + rLat, lng: zone.centerLongitude + rLng });
    hasPoints = true;
  });

  if (!hasPoints) return;

  if (selectedChild && selectedChild.lastLatitude != null && selectedChild.lastLongitude != null && routeHistory.length === 0) {
    map.panTo({ lat: selectedChild.lastLatitude, lng: selectedChild.lastLongitude });
    map.setZoom(Math.max(map.getZoom() ?? 15, 15));
    return;
  }

  map.fitBounds(bounds, { bottom: 64, left: 64, right: 64, top: 64 });
}

// ─── Icon & markup helpers ────────────────────────────────────────────────────

function getRoutePointIcon(zoom: number): google.maps.Symbol {
  const scale = Math.max(3.5, Math.min(7, zoom * 0.32));
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale,
    fillColor: "#bae6fd",
    fillOpacity: 1,
    strokeColor: "#0369a1",
    strokeWeight: 1.5,
  };
}

function buildAvatarMarkup(displayName: string, isSelected: boolean) {
  const initial = displayName.trim().charAt(0).toUpperCase() || "C";
  const ring = isSelected
    ? `style="position:absolute;inset:-6px;border-radius:50%;border:2px solid #10b981;opacity:0.3"`
    : "";
  const badge = isSelected
    ? `style="width:36px;height:36px;border-radius:50%;border:2px solid #10b981;background:#f0fdf4;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#065f46;position:relative;font-family:-apple-system,sans-serif"`
    : `style="width:32px;height:32px;border-radius:50%;border:1.5px solid #d0d7de;background:#ffffff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#24292f;position:relative;font-family:-apple-system,sans-serif"`;
  return `<div style="position:relative;display:flex;align-items:center;justify-content:center">
    ${isSelected ? `<div ${ring}></div>` : ""}
    <div ${badge}>${escapeHtml(initial)}</div>
  </div>`;
}

function buildRoutePopupHtml(point: RouteHistoryPoint) {
  return `<div style="font-family:-apple-system,sans-serif;padding:2px;min-width:160px">
    <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:#6e7781;margin-bottom:6px">Route sample</p>
    <p style="font-size:13px;font-weight:500;color:#24292f;margin-bottom:8px">${escapeHtml(formatDateTime(point.recordedAt))}</p>
    <table style="width:100%;font-size:11.5px;border-collapse:collapse">
      ${[
        ["Speed", formatSpeed(point.speedMetersPerSecond)],
        ["Battery", formatBatteryLevel(point.batteryLevel)],
        ["Charging", formatCharging(point.isCharging)],
        ["Network", point.networkType ?? "Unknown"],
      ].map(([k, v]) => `<tr>
        <td style="color:#6e7781;padding:2px 0;padding-right:12px">${escapeHtml(k as string)}</td>
        <td style="color:#24292f;font-weight:500;padding:2px 0">${escapeHtml(v as string)}</td>
      </tr>`).join("")}
    </table>
  </div>`;
}

function buildCurrentStatusPopupHtml(child: ChildSummary) {
  return `<div style="font-family:-apple-system,sans-serif;padding:2px;min-width:180px">
    <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:#6e7781;margin-bottom:6px">Live status</p>
    <p style="font-size:14px;font-weight:500;color:#24292f;margin-bottom:2px">${escapeHtml(child.displayName)}</p>
    <p style="font-size:11px;color:#6e7781;margin-bottom:8px">${escapeHtml(child.deviceName ?? "Unnamed")} · ${escapeHtml(child.platform ?? "unknown")}</p>
    <table style="width:100%;font-size:11.5px;border-collapse:collapse">
      ${[
        ["Status", child.status],
        ["Zone", child.currentZoneLabel ?? "Outside known zones"],
        ["Battery", formatBatteryLevel(child.batteryLevel)],
        ["Charging", formatCharging(child.isCharging)],
        ["Speed", formatSpeed(child.speedMetersPerSecond)],
        ["Last seen", formatDateTime(child.deviceLastSeenAt ?? child.lastRecordedAt)],
      ].map(([k, v]) => `<tr>
        <td style="color:#6e7781;padding:2px 0;padding-right:12px">${escapeHtml(k as string)}</td>
        <td style="color:#24292f;font-weight:500;padding:2px 0">${escapeHtml(v ?? "")}</td>
      </tr>`).join("")}
    </table>
  </div>`;
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatBatteryLevel(level: number | null) {
  if (level == null) return "—";
  return `${Math.round(level * 100)}%`;
}

function formatSpeed(speed: number | null) {
  if (speed == null) return "—";
  return `${Math.round(speed * 3.6)} km/h`;
}

function formatCharging(isCharging: boolean | null) {
  if (isCharging == null) return "—";
  return isCharging ? "Charging" : "Discharging";
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}