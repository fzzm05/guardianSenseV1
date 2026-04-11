import {
  childEvents,
  childDevices,
  children,
  deviceStatus,
  geofences,
  getDb,
  parentSettings,
} from "@guardiansense/db";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getAuthenticatedParentFromSession } from "@/lib/auth/get-authenticated-parent-from-session";

export async function loadParentDashboardData() {
  const authenticatedParent = await getAuthenticatedParentFromSession();

  if (!authenticatedParent) {
    redirect("/");
  }

  const db = getDb();

  const childRows = await db
    .select({
      id: children.id,
      displayName: children.displayName,
      status: children.status,
      currentZoneLabel: children.currentZoneLabel,
      lastLatitude: children.lastLatitude,
      lastLongitude: children.lastLongitude,
      lastAccuracyMeters: children.lastAccuracyMeters,
      lastRecordedAt: children.lastRecordedAt,
    })
    .from(children)
    .where(eq(children.parentId, authenticatedParent.parent.id))
    .orderBy(desc(children.lastRecordedAt), desc(children.createdAt));

  const childIds = childRows.map((child) => child.id);
  const deviceRows =
    childIds.length === 0
      ? []
      : await db
          .select({
            childId: childDevices.childId,
            deviceId: childDevices.id,
            platform: childDevices.platform,
            deviceName: childDevices.deviceName,
            deviceLastSeenAt: deviceStatus.lastSeenAt,
            appVersion: deviceStatus.appVersion,
            osVersion: deviceStatus.osVersion,
            batteryLevel: deviceStatus.batteryLevel,
            isCharging: deviceStatus.isCharging,
            networkType: deviceStatus.networkType,
            speedMetersPerSecond: deviceStatus.speedMetersPerSecond,
            locationSource: deviceStatus.source,
            statusUpdatedAt: deviceStatus.updatedAt,
            deviceCreatedAt: childDevices.createdAt,
          })
          .from(childDevices)
          .leftJoin(deviceStatus, eq(deviceStatus.deviceId, childDevices.id))
          .where(inArray(childDevices.childId, childIds))
          .orderBy(
            sql`${deviceStatus.lastSeenAt} DESC NULLS LAST`,
            sql`${deviceStatus.updatedAt} DESC NULLS LAST`,
            desc(childDevices.createdAt),
          );

  const latestDeviceByChildId = new Map<string, (typeof deviceRows)[number]>();

  for (const row of deviceRows) {
    if (!latestDeviceByChildId.has(row.childId)) {
      latestDeviceByChildId.set(row.childId, row);
    }
  }

  const mappedChildren = childRows.map((child) => ({
    ...child,
    platform: latestDeviceByChildId.get(child.id)?.platform ?? null,
    deviceName: latestDeviceByChildId.get(child.id)?.deviceName ?? null,
    currentZoneLabel: child.currentZoneLabel ?? null,
    lastRecordedAt: child.lastRecordedAt?.toISOString() ?? null,
    deviceLastSeenAt:
      latestDeviceByChildId.get(child.id)?.deviceLastSeenAt?.toISOString() ?? null,
    appVersion: latestDeviceByChildId.get(child.id)?.appVersion ?? null,
    osVersion: latestDeviceByChildId.get(child.id)?.osVersion ?? null,
    batteryLevel: latestDeviceByChildId.get(child.id)?.batteryLevel ?? null,
    isCharging: latestDeviceByChildId.get(child.id)?.isCharging ?? null,
    networkType: latestDeviceByChildId.get(child.id)?.networkType ?? null,
    speedMetersPerSecond:
      latestDeviceByChildId.get(child.id)?.speedMetersPerSecond ?? null,
    locationSource: latestDeviceByChildId.get(child.id)?.locationSource ?? null,
    latestDeviceId: latestDeviceByChildId.get(child.id)?.deviceId ?? null,
  }));

  const geofenceRows = await db
    .select({
      id: geofences.id,
      label: geofences.label,
      severity: geofences.severity,
      centerLatitude: geofences.centerLatitude,
      centerLongitude: geofences.centerLongitude,
      radiusMeters: geofences.radiusMeters,
      isActive: geofences.isActive,
      createdAt: geofences.createdAt,
      updatedAt: geofences.updatedAt,
    })
    .from(geofences)
    .where(eq(geofences.parentId, authenticatedParent.parent.id))
    .orderBy(desc(geofences.createdAt));

  const recentEventRows =
    childIds.length === 0
      ? []
      : await db
          .select({
            id: childEvents.id,
            childId: childEvents.childId,
            childDisplayName: children.displayName,
            type: childEvents.type,
            title: childEvents.title,
            detail: childEvents.detail,
            createdAt: childEvents.createdAt,
          })
          .from(childEvents)
          .innerJoin(children, eq(children.id, childEvents.childId))
          .where(inArray(childEvents.childId, childIds))
          .orderBy(desc(childEvents.createdAt))
          .limit(20);

  const safeZones = geofenceRows.map((zone) => ({
    ...zone,
    createdAt: zone.createdAt.toISOString(),
    updatedAt: zone.updatedAt.toISOString(),
  }));

  const recentEvents = recentEventRows.map((event) => ({
    ...event,
    detail: event.detail ?? null,
    createdAt: event.createdAt.toISOString(),
  }));

  const [settings] = await db
    .select({
      telegramChatId: parentSettings.telegramChatId,
    })
    .from(parentSettings)
    .where(eq(parentSettings.parentId, authenticatedParent.parent.id))
    .limit(1);

  const isTelegramLinked = Boolean(settings?.telegramChatId);

  return {
    parentId: authenticatedParent.parent.id,
    parentDisplayName: authenticatedParent.user.displayName,
    parentEmail: authenticatedParent.user.email,
    isTelegramLinked,
    children: mappedChildren,
    recentEvents,
    safeZones,
    stats: {
      onlineCount: mappedChildren.filter((child) =>
        getPresenceTone(child.deviceLastSeenAt ?? child.lastRecordedAt) === "online",
      ).length,
      staleCount: mappedChildren.filter((child) =>
        getPresenceTone(child.deviceLastSeenAt ?? child.lastRecordedAt) === "stale",
      ).length,
      dangerCount: mappedChildren.filter((child) => child.status === "danger").length,
      activeZonesCount: safeZones.filter((zone) => zone.isActive).length,
    },
  };
}

function getPresenceTone(heartbeatValue: string | null) {
  if (!heartbeatValue) {
    return "idle";
  }

  const ageMs = Date.now() - new Date(heartbeatValue).getTime();

  if (ageMs <= 2 * 60 * 1000) {
    return "online";
  }

  if (ageMs <= 10 * 60 * 1000) {
    return "recent";
  }

  return "stale";
}
