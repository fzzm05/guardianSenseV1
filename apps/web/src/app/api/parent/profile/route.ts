import { getDb, parents, users } from "@guardiansense/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedParentFromSession } from "@/lib/auth/get-authenticated-parent-from-session";
import { updateParentProfileInputSchema } from "@guardiansense/types";

export async function PATCH(req: NextRequest) {
  const authenticatedParent = await getAuthenticatedParentFromSession();
  if (!authenticatedParent) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { displayName, phoneNumber, timezone } = updateParentProfileInputSchema.parse(body);

    const db = getDb();

    await db.transaction(async (tx) => {
      // Update Users table (Name)
      if (displayName !== undefined) {
        await tx
          .update(users)
          .set({ displayName, updatedAt: new Date() })
          .where(eq(users.id, authenticatedParent.user.id));
      }

      // Update Parents table (Phone, Timezone)
      if (phoneNumber !== undefined || timezone !== undefined) {
        await tx
          .update(parents)
          .set({ 
            phoneNumber: phoneNumber ?? null, 
            timezone: timezone ?? "UTC", 
            updatedAt: new Date() 
          })
          .where(eq(parents.id, authenticatedParent.parent.id));
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
    }
    console.error("[api/parent/profile] update failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
