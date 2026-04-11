import { alerts, children, getDb } from "@guardiansense/db";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedParentFromSession } from "@/lib/auth/get-authenticated-parent-from-session";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  const authenticatedParent = await getAuthenticatedParentFromSession();
  if (!authenticatedParent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { alertId } = await params;
  const db = getDb();

  // Validate the alert belongs to one of this parent's children
  const [alert] = await db
    .select({ id: alerts.id, childId: alerts.childId })
    .from(alerts)
    .where(eq(alerts.id, alertId))
    .limit(1);

  if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });

  const [child] = await db
    .select({ id: children.id })
    .from(children)
    .where(and(eq(children.id, alert.childId), eq(children.parentId, authenticatedParent.parent.id)))
    .limit(1);

  if (!child) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db
    .update(alerts)
    .set({ acknowledgedAt: new Date() })
    .where(eq(alerts.id, alertId));

  return NextResponse.json({ ok: true });
}
