import { getDb, users } from "@guardiansense/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getAuthenticatedParentFromSession } from "@/lib/auth/get-authenticated-parent-from-session";

export async function DELETE() {
  const authenticatedParent = await getAuthenticatedParentFromSession();
  if (!authenticatedParent) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();

    // Deleting the user record triggers a cascade delete across all related tables:
    // parents, children, child_devices, parent_settings, geofences, alerts, location_events, etc.
    await db.delete(users).where(eq(users.id, authenticatedParent.user.id));

    return NextResponse.json({ 
      success: true, 
      message: "Account and all associated data have been permanently deleted." 
    });
  } catch (error) {
    console.error("[api/parent/account] deletion failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
