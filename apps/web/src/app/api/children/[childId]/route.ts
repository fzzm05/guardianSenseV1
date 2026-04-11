import { children, getDb } from "@guardiansense/db";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedParentFromSession } from "@/lib/auth/get-authenticated-parent-from-session";
import { updateChildInputSchema } from "@guardiansense/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const authenticatedParent = await getAuthenticatedParentFromSession();
  if (!authenticatedParent) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { childId } = await params;
    const body = await req.json();
    const validated = updateChildInputSchema.parse(body);

    const db = getDb();

    // Ensure the child belongs to the authenticated parent
    const result = await db
      .update(children)
      .set({
        ...validated,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(children.id, childId),
          eq(children.parentId, authenticatedParent.parent.id)
        )
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Child not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, child: result[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
    }
    console.error("[api/children/[id]] update failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
