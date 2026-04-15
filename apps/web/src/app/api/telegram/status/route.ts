import { getDb, parentSettings } from "@guardiansense/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getAuthenticatedParentFromSession } from "@/lib/auth/get-authenticated-parent-from-session";

export async function GET() {
  const authenticatedParent = await getAuthenticatedParentFromSession();

  if (!authenticatedParent) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  const [settings] = await db
    .select({ telegramChatId: parentSettings.telegramChatId })
    .from(parentSettings)
    .where(eq(parentSettings.parentId, authenticatedParent.parent.id))
    .limit(1);

  return NextResponse.json({ linked: Boolean(settings?.telegramChatId) });
}
