import { getDb, parents, parentSettings, users } from "@guardiansense/db";
import { eq } from "drizzle-orm";
import { DecodedIdToken } from "firebase-admin/auth";

import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export async function getAuthenticatedParentFromToken(
  idToken: string,
  providedDecodedToken?: DecodedIdToken,
  detectedTimezone?: string
) {
  const decodedToken = providedDecodedToken ?? (await verifyIdToken(idToken));
  const db = getDb();

  const [existingUser] = await db
    .select({
      id: users.id,
      firebaseUid: users.firebaseUid,
      email: users.email,
      displayName: users.displayName
    })
    .from(users)
    .where(eq(users.firebaseUid, decodedToken.uid))
    .limit(1);

  const user =
    existingUser ??
    (
      await db
        .insert(users)
        .values({
          firebaseUid: decodedToken.uid,
          role: "parent",
          email: decodedToken.email ?? `${decodedToken.uid}@placeholder.local`,
          displayName: decodedToken.name ?? "GuardianSense Parent"
        })
        .returning({
          id: users.id,
          firebaseUid: users.firebaseUid,
          email: users.email,
          displayName: users.displayName
        })
    )[0];

  if (!user) {
    throw new Error("Failed to resolve authenticated user.");
  }

  const [existingParent] = await db
    .select({
      id: parents.id,
      userId: parents.userId,
      timezone: parents.timezone
    })
    .from(parents)
    .where(eq(parents.userId, user.id))
    .limit(1);

  const parent =
    existingParent ??
    (
      await db
        .insert(parents)
        .values({
          userId: user.id,
          timezone: sanitizeTimezone(detectedTimezone)
        })
        .returning({
          id: parents.id,
          userId: parents.userId,
          timezone: parents.timezone
        })
    )[0];

  if (!parent) {
    throw new Error("Failed to resolve authenticated parent.");
  }

  if (!existingParent) {
    await db.insert(parentSettings).values({ parentId: parent.id }).onConflictDoNothing();
  }

  const nextTimezone = sanitizeTimezone(detectedTimezone);

  if (existingParent && shouldRefreshTimezone(existingParent.timezone, nextTimezone)) {
    const [updatedParent] = await db
      .update(parents)
      .set({
        timezone: nextTimezone,
      })
      .where(eq(parents.id, existingParent.id))
      .returning({
        id: parents.id,
        userId: parents.userId,
        timezone: parents.timezone
      });

    return {
      firebaseUid: decodedToken.uid,
      user,
      parent: updatedParent ?? existingParent
    };
  }

  return {
    firebaseUid: decodedToken.uid,
    user,
    parent
  };
}

async function verifyIdToken(idToken: string): Promise<DecodedIdToken> {
  return getFirebaseAdminAuth().verifyIdToken(idToken);
}

function sanitizeTimezone(timezone?: string) {
  if (!timezone || timezone.trim().length === 0) {
    return "UTC";
  }

  return timezone.trim();
}

function shouldRefreshTimezone(currentTimezone: string, nextTimezone: string) {
  return currentTimezone === "UTC" && nextTimezone !== "UTC";
}
