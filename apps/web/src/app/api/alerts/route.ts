import { alerts, children, getDb } from "@guardiansense/db";
import { desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getAuthenticatedParentFromSession } from "@/lib/auth/get-authenticated-parent-from-session";

export async function GET() {
  const authenticatedParent = await getAuthenticatedParentFromSession();
  if (!authenticatedParent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();

  // Get all child IDs for this parent
  const childRows = await db
    .select({ id: children.id, displayName: children.displayName })
    .from(children)
    .where(eq(children.parentId, authenticatedParent.parent.id));

  if (childRows.length === 0) return NextResponse.json({ alerts: [] });

  const childIds = childRows.map((c) => c.id);
  const childNameMap = Object.fromEntries(childRows.map((c) => [c.id, c.displayName]));

  const rows = await db
    .select({
      id: alerts.id,
      childId: alerts.childId,
      type: alerts.type,
      priority: alerts.priority,
      title: alerts.title,
      message: alerts.message,
      acknowledgedAt: alerts.acknowledgedAt,
      createdAt: alerts.createdAt,
    })
    .from(alerts)
    .where(inArray(alerts.childId, childIds))
    .orderBy(desc(alerts.createdAt))
    .limit(50);

  return NextResponse.json({
    alerts: rows.map((row) => ({
      ...row,
      childDisplayName: childNameMap[row.childId] ?? "Unknown",
      acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
    unreadCount: rows.filter((r) => !r.acknowledgedAt).length,
  });
}
