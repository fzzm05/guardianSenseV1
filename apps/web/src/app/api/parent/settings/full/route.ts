import { children, getDb, parents, parentSettings, users } from "@guardiansense/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getAuthenticatedParentFromSession } from "@/lib/auth/get-authenticated-parent-from-session";

export async function GET() {
  const authenticatedParent = await getAuthenticatedParentFromSession();
  if (!authenticatedParent) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Fetch Parent Profile & System Settings
  const [profile] = await db
    .select({
      id: parents.id,
      displayName: users.displayName,
      email: users.email,
      phoneNumber: parents.phoneNumber,
      timezone: parents.timezone,
      riskSensitivity: parentSettings.riskSensitivity,
      alertFrequencySeconds: parentSettings.alertFrequencySeconds,
      pushAlertsEnabled: parentSettings.pushAlertsEnabled,
      emailAlertsEnabled: parentSettings.emailAlertsEnabled,
      telegramChatId: parentSettings.telegramChatId,
    })
    .from(parents)
    .innerJoin(users, eq(users.id, parents.userId))
    .innerJoin(parentSettings, eq(parentSettings.parentId, parents.id))
    .where(eq(parents.id, authenticatedParent.parent.id))
    .limit(1);

  // Fetch Children
  const childrenRows = await db
    .select({
      id: children.id,
      displayName: children.displayName,
      dateOfBirth: children.dateOfBirth,
    })
    .from(children)
    .where(eq(children.parentId, authenticatedParent.parent.id));

  return NextResponse.json({
    profile: {
      ...profile,
      phoneNumber: profile?.phoneNumber ?? "",
      telegramChatId: profile?.telegramChatId ?? null,
    },
    children: childrenRows.map(c => ({
      ...c,
      dateOfBirth: c.dateOfBirth ?? "",
    })),
  });
}
