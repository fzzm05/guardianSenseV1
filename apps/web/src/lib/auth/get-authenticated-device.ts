import { childDevices, getDb } from "@guardiansense/db";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export type AuthenticatedDevice = {
  deviceId: string;
  childId: string;
  platform: "ios" | "android" | "web";
};

/**
 * Authenticates a child-device request using the device auth token
 * issued during pairing verification.
 *
 * Expects: `Authorization: Bearer <device-auth-token>`
 *
 * Returns the authenticated device identity, or `null` if the token
 * is missing, invalid, or does not match any device.
 */
export async function getAuthenticatedDevice(
  request: NextRequest,
): Promise<AuthenticatedDevice | null> {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return null;
  }

  const db = getDb();

  const [device] = await db
    .select({
      id: childDevices.id,
      childId: childDevices.childId,
      platform: childDevices.platform,
    })
    .from(childDevices)
    .where(eq(childDevices.authToken, token))
    .limit(1);

  if (!device) {
    return null;
  }

  return {
    deviceId: device.id,
    childId: device.childId,
    platform: device.platform,
  };
}
