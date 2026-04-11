import { geofences, getDb } from "@guardiansense/db";
import { createGeofenceInputSchema } from "@guardiansense/types";
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedParentFromSession } from "@/lib/auth/get-authenticated-parent-from-session";

function isZodError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError;
}

export async function GET() {
  const authenticatedParent = await getAuthenticatedParentFromSession();

  if (!authenticatedParent) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const db = getDb();
  const rows = await db
    .select({
      id: geofences.id,
      parentId: geofences.parentId,
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
    .orderBy(asc(geofences.label));

  return NextResponse.json(
    rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    { status: 200 },
  );
}

export async function POST(request: Request) {
  try {
    const authenticatedParent = await getAuthenticatedParentFromSession();

    if (!authenticatedParent) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const input = createGeofenceInputSchema.parse(body);
    const db = getDb();

    const [createdGeofence] = await db
      .insert(geofences)
      .values({
        parentId: authenticatedParent.parent.id,
        label: input.label,
        severity: input.severity,
        centerLatitude: input.centerLatitude,
        centerLongitude: input.centerLongitude,
        radiusMeters: input.radiusMeters,
      })
      .returning({
        id: geofences.id,
        parentId: geofences.parentId,
        label: geofences.label,
        severity: geofences.severity,
        centerLatitude: geofences.centerLatitude,
        centerLongitude: geofences.centerLongitude,
        radiusMeters: geofences.radiusMeters,
        isActive: geofences.isActive,
        createdAt: geofences.createdAt,
        updatedAt: geofences.updatedAt,
      });

    if (!createdGeofence) {
      return NextResponse.json(
        { error: "Failed to create geofence." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ...createdGeofence,
        createdAt: createdGeofence.createdAt.toISOString(),
        updatedAt: createdGeofence.updatedAt.toISOString(),
      },
      { status: 201 },
    );
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

    console.error("Failed to create geofence:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
