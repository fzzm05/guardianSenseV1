import { config as loadEnv } from "dotenv";
import { and, eq, gt } from "drizzle-orm";

import { childDevices, children, getDb, pairingCodes } from "../packages/db/src";

loadEnv({ path: "./apps/web/.env.local" });

async function main() {
  const code = process.argv[2];

  if (!code) {
    throw new Error("Usage: tsx scripts/debug-verify-pairing.ts <pairing-code>");
  }

  const db = getDb();

  const result = await db.transaction(async (tx) => {
    const [pairingCode] = await tx
      .select({
        id: pairingCodes.id,
        parentId: pairingCodes.parentId,
        childName: pairingCodes.childName,
        expiresAt: pairingCodes.expiresAt,
        status: pairingCodes.status,
      })
      .from(pairingCodes)
      .where(
        and(
          eq(pairingCodes.code, code),
          eq(pairingCodes.status, "pending"),
          gt(pairingCodes.expiresAt, new Date()),
        ),
      )
      .limit(1);

    console.log("[debug] pairingCode:", pairingCode);

    if (!pairingCode) {
      return null;
    }

    const [child] = await tx
      .insert(children)
      .values({
        parentId: pairingCode.parentId,
        displayName: pairingCode.childName,
        status: "unknown",
      })
      .returning({
        id: children.id,
        displayName: children.displayName,
        parentId: children.parentId,
      });

    console.log("[debug] child:", child);

    if (!child) {
      throw new Error("Failed to create child record.");
    }

    const [device] = await tx
      .insert(childDevices)
      .values({
        childId: child.id,
        platform: "android",
        deviceName: null,
      })
      .returning({
        id: childDevices.id,
        platform: childDevices.platform,
        deviceName: childDevices.deviceName,
      });

    console.log("[debug] device:", device);

    if (!device) {
      throw new Error("Failed to create child device record.");
    }

    await tx
      .update(pairingCodes)
      .set({
        status: "verified",
        verifiedAt: new Date(),
      })
      .where(eq(pairingCodes.id, pairingCode.id));

    console.log("[debug] pairing code updated:", pairingCode.id);

    return {
      child,
      device,
    };
  });

  console.log("[debug] result:", result);
}

main().catch((error) => {
  console.error("[debug] failed:", error);
  process.exit(1);
});
