import { childDevices, children, deviceStatus, getDb } from "@guardiansense/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedParentFromSession } from "@/lib/auth/get-authenticated-parent-from-session";

type RouteContext = {
  params: Promise<{
    childId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const authenticatedParent = await getAuthenticatedParentFromSession();

  if (!authenticatedParent) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { childId } = await context.params;
  const db = getDb();

  const [row] = await db
    .select({
      childId: children.id,
      batteryLevel: deviceStatus.batteryLevel,
      isCharging: deviceStatus.isCharging,
      networkType: deviceStatus.networkType,
      speedMetersPerSecond: deviceStatus.speedMetersPerSecond,
      source: deviceStatus.source,
      lastSeenAt: deviceStatus.lastSeenAt,
      lastLocationRecordedAt: deviceStatus.lastLocationRecordedAt,
      appVersion: deviceStatus.appVersion,
      osVersion: deviceStatus.osVersion,
    })
    .from(children)
    .leftJoin(childDevices, eq(childDevices.childId, children.id))
    .leftJoin(deviceStatus, eq(deviceStatus.deviceId, childDevices.id))
    .where(
      and(
        eq(children.id, childId),
        eq(children.parentId, authenticatedParent.parent.id),
      ),
    )
    .orderBy(sql`${deviceStatus.updatedAt} DESC NULLS LAST`)
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Child not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      batteryLevel: row.batteryLevel ?? null,
      isCharging: row.isCharging ?? null,
      networkType: row.networkType ?? null,
      speedMetersPerSecond: row.speedMetersPerSecond ?? null,
      source: row.source ?? null,
      lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
      lastLocationRecordedAt: row.lastLocationRecordedAt?.toISOString() ?? null,
      appVersion: row.appVersion ?? null,
      osVersion: row.osVersion ?? null,
    },
    { status: 200 },
  );
}
