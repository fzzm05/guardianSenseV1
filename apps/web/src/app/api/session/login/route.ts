import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedParentFromToken } from "@/lib/auth/get-authenticated-parent-from-token";
import { SESSION_COOKIE_NAME, SESSION_DURATION_MS } from "@/lib/auth/session";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

const sessionLoginSchema = z.object({
  idToken: z.string().min(1),
  timezone: z.string().min(1).max(120).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, timezone } = sessionLoginSchema.parse(body);
    const decodedToken = await getFirebaseAdminAuth().verifyIdToken(idToken);

    if (Date.now() / 1000 - decodedToken.auth_time > 5 * 60) {
      return NextResponse.json(
        { error: "Recent sign-in required." },
        { status: 401 }
      );
    }

    const sessionCookie = await getFirebaseAdminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS
    });
    await getAuthenticatedParentFromToken(idToken, decodedToken, timezone);

    const response = NextResponse.json({ ok: true }, { status: 200 });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_MS / 1000
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request.",
          issues: error.issues
        },
        { status: 400 }
      );
    }

    console.error("Failed to create session cookie:", error);

    return NextResponse.json(
      { error: "Failed to establish session." },
      { status: 401 }
    );
  }
}
