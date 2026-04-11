import { randomBytes } from "node:crypto";

import { getDb, childDevices, children } from "@guardiansense/db";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifyPairingCodeInputSchema } from "@guardiansense/types";
import { redis } from "@/lib/redis";

type PairingCodePayload = {
  parentId: string;
  childId: string | null;
  childName: string;
  expiresAt: string;
};

class RouteError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = "RouteError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function POST(request: NextRequest) {
  let verificationLockKey: string | null = null;

  try {
    console.log("[pairing-verify] request received");

    let body: unknown;

    try {
      body = await request.json();
    } catch (error) {
      throw new RouteError("Request body must be valid JSON.", 400, error);
    }

    console.log("[pairing-verify] raw body:", body);

    const { code, deviceMetadata, deviceName, platform } = verifyPairingCodeInputSchema.parse(body);
    console.log("[pairing-verify] parsed input:", {
      code,
      deviceMetadata,
      deviceName,
      platform
    });

    const db = getDb();

    // Check Redis for the active pairing code
    const codeKey = `pairing_code:${code}`;
    const pairingCodePayload = await redis.get<PairingCodePayload>(codeKey);

    if (!pairingCodePayload) {
      console.log("[pairing-verify] no valid pairing code found in Redis for code:", code);
      throw new RouteError("Invalid, expired, or already used code.", 404);
    }

    if (new Date(pairingCodePayload.expiresAt) <= new Date()) {
      console.log("[pairing-verify] pairing code expired before verification:", {
        code,
        expiresAt: pairingCodePayload.expiresAt,
      });

      await redis.del(codeKey);
      throw new RouteError("This pairing code has expired.", 410);
    }

    verificationLockKey = `pairing_code_lock:${code}`;
    const lockResult = await redis.set(
      verificationLockKey,
      Date.now().toString(),
      { nx: true, ex: 30 },
    );

    if (lockResult !== "OK") {
      throw new RouteError(
        "This pairing code is already being verified. Please try again.",
        409,
      );
    }

    console.log("[pairing-verify] pairing code valid, beginning transaction");

    const result = await db.transaction(async (tx) => {
      const child =
        pairingCodePayload.childId
          ? await tx
              .select({
                id: children.id,
                displayName: children.displayName,
                parentId: children.parentId
              })
              .from(children)
              .where(
                and(
                  eq(children.id, pairingCodePayload.childId),
                  eq(children.parentId, pairingCodePayload.parentId)
                )
              )
              .limit(1)
              .then((rows) => rows[0])
          : await tx
              .insert(children)
              .values({
                parentId: pairingCodePayload.parentId,
                displayName: pairingCodePayload.childName,
                status: "unknown"
              })
              .returning({
                id: children.id,
                displayName: children.displayName,
                parentId: children.parentId
              })
              .then((rows) => rows[0]);

      if (!child) {
        throw new RouteError("Failed to resolve child record for this pairing code.", 500);
      }

      console.log("[pairing-verify] child resolved:", child);

      const existingDevices = await tx
        .select({
          id: childDevices.id,
          platform: childDevices.platform,
          deviceBrand: childDevices.deviceBrand,
          deviceModel: childDevices.deviceModel,
          osVersion: childDevices.osVersion,
          deviceName: childDevices.deviceName,
        })
        .from(childDevices)
        .where(eq(childDevices.childId, child.id));

      const matchingDevice = existingDevices.find((existingDevice) =>
        existingDevice.platform === platform &&
        existingDevice.deviceBrand === (deviceMetadata?.deviceBrand ?? null) &&
        existingDevice.deviceModel === (deviceMetadata?.deviceModel ?? null)
      );

      const deviceAccessMode =
        existingDevices.length === 0
          ? "first-device"
          : matchingDevice
            ? "recognized-device"
            : "new-device";

      const deviceAuthToken = randomBytes(32).toString("hex");

      const device =
        matchingDevice
          ? await tx
              .update(childDevices)
              .set({
                deviceName: deviceName ?? matchingDevice.deviceName,
                deviceBrand: deviceMetadata?.deviceBrand ?? matchingDevice.deviceBrand,
                deviceModel: deviceMetadata?.deviceModel ?? matchingDevice.deviceModel,
                osVersion: deviceMetadata?.osVersion ?? matchingDevice.osVersion,
                appVersion: deviceMetadata?.appVersion ?? null,
                authToken: deviceAuthToken
              })
              .where(eq(childDevices.id, matchingDevice.id))
              .returning({
                id: childDevices.id,
                appVersion: childDevices.appVersion,
                deviceBrand: childDevices.deviceBrand,
                deviceModel: childDevices.deviceModel,
                platform: childDevices.platform,
                deviceName: childDevices.deviceName,
                authToken: childDevices.authToken
              })
              .then((rows) => rows[0])
          : await tx
              .insert(childDevices)
              .values({
                childId: child.id,
                platform,
                deviceName: deviceName ?? null,
                deviceBrand: deviceMetadata?.deviceBrand ?? null,
                deviceModel: deviceMetadata?.deviceModel ?? null,
                osVersion: deviceMetadata?.osVersion ?? null,
                appVersion: deviceMetadata?.appVersion ?? null,
                authToken: deviceAuthToken
              })
              .returning({
                id: childDevices.id,
                appVersion: childDevices.appVersion,
                deviceBrand: childDevices.deviceBrand,
                deviceModel: childDevices.deviceModel,
                platform: childDevices.platform,
                deviceName: childDevices.deviceName,
                authToken: childDevices.authToken
              })
              .then((rows) => rows[0]);

      if (!device) {
        throw new RouteError("Failed to create child device record.", 500);
      }

      console.log("[pairing-verify] device created:", device);

      return {
        child,
        device,
        deviceAccessMode,
        pairingMode: pairingCodePayload.childId ? "existing-child" : "new-child",
      };
    });

    console.log("[pairing-verify] verification successful:", {
      childId: result.child.id,
      deviceId: result.device.id
    });

    const lookupKey = `pairing_lookup:${pairingCodePayload.parentId}:${pairingCodePayload.childId || pairingCodePayload.childName}`;
    await redis.del(codeKey);
    await redis.del(lookupKey);

    return NextResponse.json(
      {
        childId: result.child.id,
        childName: result.child.displayName,
        parentId: result.child.parentId,
        deviceId: result.device.id,
        deviceToken: result.device.authToken,
        platform: result.device.platform,
        pairingMode: result.pairingMode,
        deviceAccessMode: result.deviceAccessMode,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("[pairing-verify] invalid request payload:", error.issues);

      return NextResponse.json(
        {
          error: "Invalid request.",
          issues: error.issues
        },
        { status: 400 }
      );
    }

    if (error instanceof RouteError) {
      console.error("[pairing-verify] handled route error:", {
        message: error.message,
        statusCode: error.statusCode,
        details: error.details
      });

      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    const postgresError = error as { code?: string; detail?: string; constraint?: string };

    if (postgresError.code === "23503") {
      console.error("[pairing-verify] foreign key violation:", postgresError);

      return NextResponse.json(
        { error: "Pairing code references a missing parent record." },
        { status: 409 }
      );
    }

    if (postgresError.code === "23505") {
      console.error("[pairing-verify] unique constraint violation:", postgresError);

      return NextResponse.json(
        { error: "This pairing request conflicts with an existing record. Please try again." },
        { status: 409 }
      );
    }

    console.error("Failed to verify pairing code:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  } finally {
    if (verificationLockKey) {
      await redis.del(verificationLockKey);
    }
  }
}
