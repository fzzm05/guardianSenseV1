import { getDb, parentSettings } from "@guardiansense/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedParentFromSession } from "@/lib/auth/get-authenticated-parent-from-session";
import { updateParentSettingsInputSchema } from "@guardiansense/types";

export async function PATCH(req: NextRequest) {
  const authenticatedParent = await getAuthenticatedParentFromSession();
  if (!authenticatedParent) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = updateParentSettingsInputSchema.parse(body);

    const db = getDb();

    await db
      .update(parentSettings)
      .set({
        ...validated,
        updatedAt: new Date(),
      })
      .where(eq(parentSettings.parentId, authenticatedParent.parent.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
    }
    console.error("[api/parent/settings] update failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
