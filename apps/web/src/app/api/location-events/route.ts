import {
  alerts,
  childEvents,
  childDevices,
  children,
  deviceStatus,
  geofences,
  getDb,
  locationEvents,
  parentSettings,
} from "@guardiansense/db";
import {
  createLocationEventInputSchema,
  type CreateLocationEventInput,
} from "@guardiansense/types";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedDevice } from "@/lib/auth/get-authenticated-device";

class RouteError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "RouteError";
    this.statusCode = statusCode;
  }
}

const MIN_SNAPSHOT_MOVEMENT_METERS = 20;
const MAX_SNAPSHOT_INTERVAL_MS = 30_000;
const URGENT_BATTERY_LEVEL = 0.12;
const DANGER_SPEED_METERS_PER_SECOND = 22;

function isZodError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError || (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as { issues?: unknown }).issues)
  );
}

export async function POST(request: NextRequest) {
  const requestStartedAt = performance.now();

  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new RouteError("Request body must be valid JSON.", 400);
    }

    const input = createLocationEventInputSchema.parse(
      normalizeLocationEventRequest(body),
    );
    const parseCompletedAt = performance.now();

    const authenticatedDevice = await getAuthenticatedDevice(request);

    if (!authenticatedDevice) {
      return NextResponse.json(
        { error: "Missing or invalid device authorization." },
        { status: 401 },
      );
    }

    if (authenticatedDevice.childId !== input.childId) {
      return NextResponse.json(
        { error: "Device is not authorized for this child." },
        { status: 403 },
      );
    }

    if (input.deviceId && authenticatedDevice.deviceId !== input.deviceId) {
      return NextResponse.json(
        { error: "Device ID does not match authenticated device." },
        { status: 403 },
      );
    }

    const db = getDb();

    const result = await db.transaction(async (tx) => {
      const transactionStartedAt = performance.now();
      const [child] = await tx
        .select({
          id: children.id,
          parentId: children.parentId,
          displayName: children.displayName,
          currentZoneLabel: children.currentZoneLabel,
          status: children.status,
          lastLatitude: children.lastLatitude,
          lastLongitude: children.lastLongitude,
          lastAccuracyMeters: children.lastAccuracyMeters,
          lastRecordedAt: children.lastRecordedAt,
          telegramChatId: parentSettings.telegramChatId,
          pushAlertsEnabled: parentSettings.pushAlertsEnabled,
        })
        .from(children)
        .leftJoin(parentSettings, eq(parentSettings.parentId, children.parentId))
        .where(eq(children.id, input.childId))
        .limit(1);
      const childLookupCompletedAt = performance.now();

      if (!child) {
        throw new RouteError("Child not found.", 404);
      }

      let previousIsCharging: boolean | null = null;

      if (input.deviceId) {
        const [device] = await tx
          .select({
            id: childDevices.id,
            childId: childDevices.childId,
            isCharging: deviceStatus.isCharging,
          })
          .from(childDevices)
          .leftJoin(deviceStatus, eq(childDevices.id, deviceStatus.deviceId))
          .where(
            and(
              eq(childDevices.id, input.deviceId),
              eq(childDevices.childId, input.childId),
            ),
          )
          .limit(1);
        console.log("[location-events] device ownership lookup ms:", {
          childId: input.childId,
          deviceId: input.deviceId,
          durationMs: roundDuration(performance.now() - childLookupCompletedAt),
        });

        if (!device) {
          throw new RouteError("Device does not belong to this child.", 409);
        }
        
        previousIsCharging = device.isCharging;
      }

      const recordedAt = new Date(input.point.recordedAt);
      const activeZones = await tx
        .select({
          id: geofences.id,
          label: geofences.label,
          severity: geofences.severity,
          centerLatitude: geofences.centerLatitude,
          centerLongitude: geofences.centerLongitude,
          radiusMeters: geofences.radiusMeters,
        })
        .from(geofences)
        .where(
          and(
            eq(geofences.parentId, child.parentId),
            eq(geofences.isActive, true),
          ),
        );
      const zoneQueryCompletedAt = performance.now();
      const zoneMatch = determineCurrentZone(activeZones, input.point.latitude, input.point.longitude);
      logZoneEvaluation({
        childId: input.childId,
        latitude: input.point.latitude,
        longitude: input.point.longitude,
        zones: activeZones,
        zoneMatch,
      });
      const nextStatus = deriveChildStatus(input, zoneMatch?.severity ?? null);
      const urgentUpdate = isUrgentLocationUpdate(input, nextStatus);
      const nextZoneLabel = zoneMatch?.label ?? null;

      const snapshotDecision = shouldUpdateChildSnapshot({
        input,
        child,
        recordedAt,
        urgentUpdate,
      });

      const shouldRefreshChildReadModel =
        snapshotDecision.shouldUpdateSnapshot ||
        child.currentZoneLabel !== nextZoneLabel ||
        child.status !== nextStatus;

      const [event] = await tx
        .insert(locationEvents)
        .values(mapLocationEventInsert(input))
        .returning({
          id: locationEvents.id,
          createdAt: locationEvents.createdAt,
        });
      const locationInsertCompletedAt = performance.now();

      if (!event) {
        throw new RouteError("Failed to store location event.", 500);
      }

      if (shouldRefreshChildReadModel) {
        await tx
          .update(children)
          .set({
            lastLatitude: snapshotDecision.shouldUpdateSnapshot
              ? input.point.latitude
              : child.lastLatitude,
            lastLongitude: snapshotDecision.shouldUpdateSnapshot
              ? input.point.longitude
              : child.lastLongitude,
            lastAccuracyMeters: snapshotDecision.shouldUpdateSnapshot
              ? (input.point.accuracyMeters ?? null)
              : child.lastAccuracyMeters,
            lastRecordedAt: snapshotDecision.shouldUpdateSnapshot
              ? recordedAt
              : child.lastRecordedAt,
            currentZoneLabel: nextZoneLabel,
            status: nextStatus,
          })
          .where(eq(children.id, input.childId));
      }
      const childSnapshotCompletedAt = performance.now();

      if (input.deviceId) {
        const hasDeviceMetadataUpdate = Boolean(
          input.telemetry?.appVersion || input.telemetry?.osVersion,
        );

        if (hasDeviceMetadataUpdate) {
          await tx
            .update(childDevices)
            .set({
              appVersion: input.telemetry?.appVersion ?? undefined,
              lastSeenAt: recordedAt,
              osVersion: input.telemetry?.osVersion ?? undefined,
            })
            .where(eq(childDevices.id, input.deviceId));
        }
        const childDeviceUpdateCompletedAt = performance.now();

        await tx
          .insert(deviceStatus)
          .values({
            deviceId: input.deviceId,
            childId: input.childId,
            batteryLevel: input.telemetry?.batteryLevel ?? null,
            isCharging: input.telemetry?.isCharging ?? null,
            networkType: input.telemetry?.networkType ?? null,
            speedMetersPerSecond: input.point.speedMetersPerSecond ?? null,
            source: input.source,
            appVersion: input.telemetry?.appVersion ?? null,
            osVersion: input.telemetry?.osVersion ?? null,
            lastSeenAt: recordedAt,
            lastLocationRecordedAt: recordedAt,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: deviceStatus.deviceId,
            set: {
              childId: input.childId,
              batteryLevel: input.telemetry?.batteryLevel ?? null,
              isCharging: input.telemetry?.isCharging ?? null,
              networkType: input.telemetry?.networkType ?? null,
              speedMetersPerSecond: input.point.speedMetersPerSecond ?? null,
              source: input.source,
              appVersion: input.telemetry?.appVersion ?? null,
              osVersion: input.telemetry?.osVersion ?? null,
              lastSeenAt: recordedAt,
              lastLocationRecordedAt: recordedAt,
              updatedAt: new Date(),
            },
          });
        const deviceStatusUpsertCompletedAt = performance.now();

        const timelineEvents = buildChildTimelineEvents({
          childId: input.childId,
          previousZoneLabel: child.currentZoneLabel ?? null,
          nextZoneLabel,
          nextZoneSeverity: zoneMatch?.severity ?? null,
          previousIsCharging,
          nextIsCharging: input.telemetry?.isCharging ?? null,
        });

        console.log("[child-events] derived timeline events:", {
          childId: input.childId,
          previousZoneLabel: child.currentZoneLabel ?? null,
          nextZoneLabel,
          nextZoneSeverity: zoneMatch?.severity ?? null,
          previousIsCharging,
          nextIsCharging: input.telemetry?.isCharging ?? null,
          eventCount: timelineEvents.length,
          eventTypes: timelineEvents.map((timelineEvent) => timelineEvent.type),
        });

        if (timelineEvents.length > 0) {
          const insertedTimelineEvents = await tx
            .insert(childEvents)
            .values(timelineEvents)
            .returning({
              id: childEvents.id,
              type: childEvents.type,
              title: childEvents.title,
              detail: childEvents.detail,
            });

          console.log("[child-events] inserted timeline events:", {
            childId: input.childId,
            insertedCount: insertedTimelineEvents.length,
            insertedEventTypes: insertedTimelineEvents.map(
              (insertedTimelineEvent) => insertedTimelineEvent.type,
            ),
          });

          if (child.telegramChatId && child.pushAlertsEnabled) {
            void sendTelegramAlerts(child.telegramChatId, insertedTimelineEvents, {
              childId: child.id,
              childName: child.displayName,
              batteryLevel: input.telemetry?.batteryLevel ?? null,
              isCharging: input.telemetry?.isCharging ?? null,
              speedMetersPerSecond: input.point.speedMetersPerSecond ?? null,
              latitude: input.point.latitude,
              longitude: input.point.longitude,
              nextStatus,
            });
          }
        }

        console.log("[location-events] transaction timing ms:", {
          childId: input.childId,
          deviceId: input.deviceId,
          parseMs: roundDuration(parseCompletedAt - requestStartedAt),
          childLookupMs: roundDuration(childLookupCompletedAt - transactionStartedAt),
          zoneQueryMs: roundDuration(zoneQueryCompletedAt - childLookupCompletedAt),
          locationInsertMs: roundDuration(locationInsertCompletedAt - zoneQueryCompletedAt),
          childSnapshotMs: roundDuration(childSnapshotCompletedAt - locationInsertCompletedAt),
          childDeviceUpdateMs: roundDuration(
            childDeviceUpdateCompletedAt - childSnapshotCompletedAt,
          ),
          deviceStatusUpsertMs: roundDuration(
            deviceStatusUpsertCompletedAt - childDeviceUpdateCompletedAt,
          ),
          childEventsMs: roundDuration(performance.now() - deviceStatusUpsertCompletedAt),
          transactionTotalMs: roundDuration(performance.now() - transactionStartedAt),
        });
      } else {
        const timelineEvents = buildChildTimelineEvents({
          childId: input.childId,
          previousZoneLabel: child.currentZoneLabel ?? null,
          nextZoneLabel,
          nextZoneSeverity: zoneMatch?.severity ?? null,
          previousIsCharging: null,
          nextIsCharging: null,
        });

        console.log("[child-events] derived timeline events:", {
          childId: input.childId,
          previousZoneLabel: child.currentZoneLabel ?? null,
          nextZoneLabel,
          nextZoneSeverity: zoneMatch?.severity ?? null,
          previousIsCharging: null,
          nextIsCharging: null,
          eventCount: timelineEvents.length,
          eventTypes: timelineEvents.map((timelineEvent) => timelineEvent.type),
        });

        if (timelineEvents.length > 0) {
          const insertedTimelineEvents = await tx
            .insert(childEvents)
            .values(timelineEvents)
            .returning({
              id: childEvents.id,
              type: childEvents.type,
            });

          console.log("[child-events] inserted timeline events:", {
            childId: input.childId,
            insertedCount: insertedTimelineEvents.length,
            insertedEventTypes: insertedTimelineEvents.map(
              (insertedTimelineEvent) => insertedTimelineEvent.type,
            ),
          });
        }

        console.log("[location-events] transaction timing ms:", {
          childId: input.childId,
          deviceId: null,
          parseMs: roundDuration(parseCompletedAt - requestStartedAt),
          childLookupMs: roundDuration(childLookupCompletedAt - transactionStartedAt),
          zoneQueryMs: roundDuration(zoneQueryCompletedAt - childLookupCompletedAt),
          locationInsertMs: roundDuration(locationInsertCompletedAt - zoneQueryCompletedAt),
          childSnapshotMs: roundDuration(childSnapshotCompletedAt - locationInsertCompletedAt),
          childEventsMs: roundDuration(performance.now() - childSnapshotCompletedAt),
          transactionTotalMs: roundDuration(performance.now() - transactionStartedAt),
        });
      }

      return {
        eventId: event.id,
        childId: input.childId,
        deviceId: input.deviceId ?? null,
        snapshotUpdated: shouldRefreshChildReadModel,
        snapshotReason: snapshotDecision.reason,
        urgentUpdate,
        nextStatus,
        currentZoneLabel: zoneMatch?.label ?? null,
        recordedAt: recordedAt.toISOString(),
        createdAt: event.createdAt.toISOString(),
      };
    });

    console.log("[location-events] request total ms:", {
      childId: input.childId,
      deviceId: input.deviceId ?? null,
      totalMs: roundDuration(performance.now() - requestStartedAt),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json(
        {
          error: "Invalid request.",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    if (error instanceof RouteError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    console.error("Failed to create location event:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

function roundDuration(value: number) {
  return Number(value.toFixed(1));
}

function normalizeLocationEventRequest(body: unknown) {
  if (typeof body !== "object" || body === null) {
    return body;
  }

  const bodyRecord = body as Record<string, unknown>;
  const point =
    typeof bodyRecord.point === "object" && bodyRecord.point !== null
      ? bodyRecord.point as Record<string, unknown>
      : undefined;
  const telemetry =
    typeof bodyRecord.telemetry === "object" && bodyRecord.telemetry !== null
      ? bodyRecord.telemetry as Record<string, unknown>
      : undefined;

  return {
    ...bodyRecord,
    point: point
      ? {
          ...point,
          accuracyMeters: point.accuracyMeters ?? null,
          altitudeMeters: point.altitudeMeters ?? null,
          speedMetersPerSecond: point.speedMetersPerSecond ?? null,
          headingDegrees: point.headingDegrees ?? null,
        }
      : bodyRecord.point,
    telemetry: telemetry
      ? {
          ...telemetry,
          batteryLevel: telemetry.batteryLevel ?? null,
          isCharging: telemetry.isCharging ?? null,
          networkType: telemetry.networkType ?? null,
          osVersion: telemetry.osVersion ?? null,
          appVersion: telemetry.appVersion ?? null,
        }
      : bodyRecord.telemetry,
  };
}

type SnapshotDecisionInput = {
  input: CreateLocationEventInput;
  child: {
    id: string;
    currentZoneLabel: string | null;
    status: "safe" | "warning" | "danger" | "offline" | "unknown";
    lastLatitude: number | null;
    lastLongitude: number | null;
    lastAccuracyMeters: number | null;
    lastRecordedAt: Date | null;
  };
  recordedAt: Date;
  urgentUpdate: boolean;
};

function shouldUpdateChildSnapshot({
  input,
  child,
  recordedAt,
  urgentUpdate,
}: SnapshotDecisionInput) {
  const lastRecordedAt =
    child.lastRecordedAt instanceof Date ? child.lastRecordedAt : null;
  const isStaleEvent = Boolean(lastRecordedAt && recordedAt < lastRecordedAt);

  if (isStaleEvent) {
    return {
      shouldUpdateSnapshot: false,
      reason: "stale-event",
    } as const;
  }

  if (
    child.lastLatitude == null ||
    child.lastLongitude == null ||
    !lastRecordedAt
  ) {
    return {
      shouldUpdateSnapshot: true,
      reason: "initial-snapshot",
    } as const;
  }

  const distanceMovedMeters = calculateDistanceMeters(
    child.lastLatitude,
    child.lastLongitude,
    input.point.latitude,
    input.point.longitude,
  );
  const elapsedMs = recordedAt.getTime() - lastRecordedAt.getTime();
  const accuracyChangedEnough = hasAccuracyChangedEnough(
    child.lastAccuracyMeters,
    input.point.accuracyMeters ?? null,
  );

  if (urgentUpdate) {
    return {
      shouldUpdateSnapshot: true,
      reason: "urgent-update",
    } as const;
  }

  if (distanceMovedMeters >= MIN_SNAPSHOT_MOVEMENT_METERS) {
    return {
      shouldUpdateSnapshot: true,
      reason: "movement-threshold",
    } as const;
  }

  if (elapsedMs >= MAX_SNAPSHOT_INTERVAL_MS) {
    return {
      shouldUpdateSnapshot: true,
      reason: "heartbeat-threshold",
    } as const;
  }

  if (accuracyChangedEnough) {
    return {
      shouldUpdateSnapshot: true,
      reason: "accuracy-improved",
    } as const;
  }

  return {
    shouldUpdateSnapshot: false,
    reason: "below-threshold",
  } as const;
}

function deriveChildStatus(
  input: CreateLocationEventInput,
  zoneSeverity: "safe" | "caution" | "danger" | null,
) {
  if (zoneSeverity === "danger") {
    return "danger" as const;
  }

  if (zoneSeverity === "caution") {
    return "warning" as const;
  }

  if (zoneSeverity === "safe") {
    return "safe" as const;
  }

  if (isUrgentLocationUpdate(input, "danger")) {
    return "danger" as const;
  }

  return "unknown" as const;
}

function isUrgentLocationUpdate(
  input: CreateLocationEventInput,
  currentStatus: "safe" | "warning" | "danger" | "unknown",
) {
  if (currentStatus === "danger") {
    return true;
  }

  if (input.telemetry?.batteryLevel != null && input.telemetry.batteryLevel <= URGENT_BATTERY_LEVEL) {
    return true;
  }

  if (
    input.point.speedMetersPerSecond != null &&
    input.point.speedMetersPerSecond >= DANGER_SPEED_METERS_PER_SECOND
  ) {
    return true;
  }

  return false;
}

function hasAccuracyChangedEnough(
  previousAccuracyMeters: number | null,
  nextAccuracyMeters: number | null,
) {
  if (previousAccuracyMeters == null || nextAccuracyMeters == null) {
    return false;
  }

  return nextAccuracyMeters < previousAccuracyMeters * 0.6;
}

function calculateDistanceMeters(
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number,
) {
  const earthRadiusMeters = 6_371_000;
  const latitudeDeltaRadians = toRadians(endLatitude - startLatitude);
  const longitudeDeltaRadians = toRadians(endLongitude - startLongitude);
  const startLatitudeRadians = toRadians(startLatitude);
  const endLatitudeRadians = toRadians(endLatitude);

  const a =
    Math.sin(latitudeDeltaRadians / 2) ** 2 +
    Math.cos(startLatitudeRadians) *
      Math.cos(endLatitudeRadians) *
      Math.sin(longitudeDeltaRadians / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function mapLocationEventInsert(input: CreateLocationEventInput) {
  return {
    childId: input.childId,
    deviceId: input.deviceId ?? null,
    latitude: input.point.latitude,
    longitude: input.point.longitude,
    accuracyMeters: input.point.accuracyMeters ?? null,
    altitudeMeters: input.point.altitudeMeters ?? null,
    speedMetersPerSecond: input.point.speedMetersPerSecond ?? null,
    headingDegrees: input.point.headingDegrees ?? null,
    batteryLevel: input.telemetry?.batteryLevel ?? null,
    isCharging: input.telemetry?.isCharging ?? null,
    networkType: input.telemetry?.networkType ?? null,
    osVersion: input.telemetry?.osVersion ?? null,
    appVersion: input.telemetry?.appVersion ?? null,
    source: input.source,
    recordedAt: new Date(input.point.recordedAt),
  };
}

type ZoneCandidate = {
  id: string;
  label: string;
  severity: "safe" | "caution" | "danger";
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
};

function determineCurrentZone(
  zones: ZoneCandidate[],
  latitude: number,
  longitude: number,
) {
  const containingZones = zones
    .map((zone) => ({
      ...zone,
      distanceMeters: calculateDistanceMeters(
        zone.centerLatitude,
        zone.centerLongitude,
        latitude,
        longitude,
      ),
    }))
    .filter((zone) => zone.distanceMeters <= zone.radiusMeters);

  if (containingZones.length === 0) {
    return null;
  }

  containingZones.sort((left, right) => {
    const severityRankDifference = getZoneSeverityRank(right.severity) - getZoneSeverityRank(left.severity);

    if (severityRankDifference !== 0) {
      return severityRankDifference;
    }

    return left.distanceMeters - right.distanceMeters;
  });

  return containingZones[0] ?? null;
}

function logZoneEvaluation({
  childId,
  latitude,
  longitude,
  zones,
  zoneMatch,
}: {
  childId: string;
  latitude: number;
  longitude: number;
  zones: ZoneCandidate[];
  zoneMatch:
    | (ZoneCandidate & {
        distanceMeters: number;
      })
    | null;
}) {
  const zoneDistances = zones.map((zone) => {
    const distanceMeters = calculateDistanceMeters(
      zone.centerLatitude,
      zone.centerLongitude,
      latitude,
      longitude,
    );

    return {
      id: zone.id,
      label: zone.label,
      severity: zone.severity,
      radiusMeters: zone.radiusMeters,
      distanceMeters: Number(distanceMeters.toFixed(2)),
      inside: distanceMeters <= zone.radiusMeters,
    };
  });

  console.log("[zones] evaluated location against active zones:", {
    childId,
    point: {
      latitude,
      longitude,
    },
    zoneDistances,
    selectedZone: zoneMatch
      ? {
          id: zoneMatch.id,
          label: zoneMatch.label,
          severity: zoneMatch.severity,
          distanceMeters: Number(zoneMatch.distanceMeters.toFixed(2)),
        }
      : null,
  });
}

function getZoneSeverityRank(severity: "safe" | "caution" | "danger") {
  switch (severity) {
    case "danger":
      return 3;
    case "caution":
      return 2;
    case "safe":
      return 1;
    default:
      return 0;
  }
}

function buildChildTimelineEvents({
  childId,
  previousZoneLabel,
  nextZoneLabel,
  nextZoneSeverity,
  previousIsCharging,
  nextIsCharging,
}: {
  childId: string;
  previousZoneLabel: string | null;
  nextZoneLabel: string | null;
  nextZoneSeverity: "safe" | "caution" | "danger" | null;
  previousIsCharging: boolean | null;
  nextIsCharging: boolean | null;
}) {
  const events: Array<typeof childEvents.$inferInsert> = [];

  if (previousZoneLabel !== nextZoneLabel) {
    if (!previousZoneLabel && nextZoneLabel) {
      events.push({
        childId,
        type: "zone_entered",
        title: `Entered ${nextZoneLabel}`,
        detail: nextZoneSeverity
          ? `Child entered a ${nextZoneSeverity} zone.`
          : "Child entered a tracked zone.",
        metadataJson: {
          previousZoneLabel,
          nextZoneLabel,
          nextZoneSeverity,
        },
      });
    } else if (previousZoneLabel && !nextZoneLabel) {
      events.push({
        childId,
        type: "zone_exited",
        title: `Exited ${previousZoneLabel}`,
        detail: "Child left the previously tracked zone.",
        metadataJson: {
          previousZoneLabel,
          nextZoneLabel,
        },
      });
    } else if (previousZoneLabel && nextZoneLabel) {
      events.push({
        childId,
        type: "zone_changed",
        title: `Moved from ${previousZoneLabel} to ${nextZoneLabel}`,
        detail: nextZoneSeverity
          ? `Current zone is marked ${nextZoneSeverity}.`
          : "Child switched between tracked zones.",
        metadataJson: {
          previousZoneLabel,
          nextZoneLabel,
          nextZoneSeverity,
        },
      });
    }
  }

  if (
    previousIsCharging != null &&
    nextIsCharging != null &&
    previousIsCharging !== nextIsCharging
  ) {
    events.push({
      childId,
      type: nextIsCharging ? "charging_started" : "charging_stopped",
      title: nextIsCharging ? "Charging started" : "Charging stopped",
      detail: nextIsCharging
        ? "Device was plugged in or resumed charging."
        : "Device was unplugged or stopped charging.",
      metadataJson: {
        previousIsCharging,
        nextIsCharging,
      },
    });
  }

  return events;
}

async function sendTelegramAlerts(
  chatId: string,
  events: { type: string; title: string; detail: string | null }[],
  ctx: {
    childId: string;
    childName: string;
    batteryLevel: number | null;
    isCharging: boolean | null;
    speedMetersPerSecond: number | null;
    latitude: number;
    longitude: number;
    nextStatus: string;
  }
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const db = getDb();

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://guardian-sense-v1-web.vercel.app";
  const statusEmoji = ctx.nextStatus === "danger" ? "🔴" : ctx.nextStatus === "warning" ? "🟡" : "🟢";
  const battery = ctx.batteryLevel != null ? `${Math.round(ctx.batteryLevel * 100)}%` : "Unknown";
  const charging = ctx.isCharging == null ? "" : ctx.isCharging ? " ⚡" : "";
  const speed = ctx.speedMetersPerSecond != null ? `${(ctx.speedMetersPerSecond * 3.6).toFixed(1)} km/h` : null;
  const dashboardLink = `${APP_URL}/dashboard?child=${ctx.childId}`;

  for (const event of events) {
    const lines: string[] = [];
    lines.push(`🚨 *GuardianSense Alert — ${ctx.childName}*`);
    lines.push(``);
    lines.push(`${statusEmoji} *Status:* ${ctx.nextStatus.toUpperCase()}`);
    lines.push(``);
    lines.push(`📍 *${event.title}*`);
    if (event.detail) lines.push(`_${event.detail}_`);
    lines.push(``);
    lines.push(`🔋 Battery: ${battery}${charging}`);
    if (speed) lines.push(`💨 Speed: ${speed}`);
    lines.push(``);
    lines.push(`[📱 Track ${ctx.childName} live on GuardianSense](${dashboardLink})`);

    const text = lines.join("\n");
    const alertMessage = [
      event.detail ?? "",
      `Battery: ${battery}${charging}`,
      speed ? `Speed: ${speed}` : null,
    ].filter(Boolean).join(" · ");

    // Derive alert type and priority from event type
    const alertType =
      event.type === "zone_entered" || event.type === "zone_exited" || event.type === "zone_changed"
        ? "geofence" as const
        : event.type === "charging_started" || event.type === "charging_stopped"
          ? "device" as const
          : "safety" as const;

    const alertPriority =
      ctx.nextStatus === "danger" ? "high" as const
        : ctx.nextStatus === "warning" ? "medium" as const
          : "low" as const;

    // Persist alert record
    await db.insert(alerts).values({
      childId: ctx.childId,
      type: alertType,
      priority: alertPriority,
      title: event.title,
      message: alertMessage,
      actionsJson: [],
    }).catch(e => console.error("[telegram] failed to persist alert:", e));

    // Send Telegram push (if token available)
    if (token) {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      }).catch(e => console.error("[telegram] push failed:", e));

      if (res && !res.ok) {
        console.error("[telegram] sendMessage failed:", res.status, await res.text());
      } else {
        console.log("[telegram] alert sent to chat", chatId, "for event", event.type);
      }
    }
  }
}

