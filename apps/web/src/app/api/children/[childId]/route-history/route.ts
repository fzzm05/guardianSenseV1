import { children, getDb, locationEvents } from "@guardiansense/db";
import { and, desc, eq, gte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedParentFromSession } from "@/lib/auth/get-authenticated-parent-from-session";

type RouteContext = {
  params: Promise<{
    childId: string;
  }>;
};

const DEFAULT_HISTORY_HOURS = 6;
const MAX_HISTORY_HOURS = 24;
const MAX_POINTS = 400;

export async function GET(request: NextRequest, context: RouteContext) {
  const authenticatedParent = await getAuthenticatedParentFromSession();

  if (!authenticatedParent) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { childId } = await context.params;
  const rawHours = Number(request.nextUrl.searchParams.get("hours") ?? DEFAULT_HISTORY_HOURS);
  const hours = Number.isFinite(rawHours)
    ? Math.min(Math.max(Math.round(rawHours), 1), MAX_HISTORY_HOURS)
    : DEFAULT_HISTORY_HOURS;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const db = getDb();

  const [child] = await db
    .select({
      id: children.id,
    })
    .from(children)
    .where(
      and(
        eq(children.id, childId),
        eq(children.parentId, authenticatedParent.parent.id),
      ),
    )
    .limit(1);

  if (!child) {
    return NextResponse.json({ error: "Child not found." }, { status: 404 });
  }

  const recentRows = await db
    .select({
      id: locationEvents.id,
      latitude: locationEvents.latitude,
      longitude: locationEvents.longitude,
      accuracyMeters: locationEvents.accuracyMeters,
      speedMetersPerSecond: locationEvents.speedMetersPerSecond,
      batteryLevel: locationEvents.batteryLevel,
      isCharging: locationEvents.isCharging,
      networkType: locationEvents.networkType,
      source: locationEvents.source,
      recordedAt: locationEvents.recordedAt,
    })
    .from(locationEvents)
    .where(
      and(
        eq(locationEvents.childId, childId),
        gte(locationEvents.recordedAt, since),
      ),
    )
    .orderBy(desc(locationEvents.recordedAt))
    .limit(MAX_POINTS);

  const points = recentRows
    .reverse()
    .map((row) => ({
      id: row.id,
      latitude: row.latitude,
      longitude: row.longitude,
      accuracyMeters: row.accuracyMeters ?? null,
      speedMetersPerSecond: row.speedMetersPerSecond ?? null,
      batteryLevel: row.batteryLevel ?? null,
      isCharging: row.isCharging ?? null,
      networkType: row.networkType ?? null,
      source: row.source,
      recordedAt: row.recordedAt.toISOString(),
    }));

  return NextResponse.json(
    {
      childId,
      hours,
      points,
    },
    { status: 200 },
  );
}
