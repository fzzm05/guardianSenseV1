import { cookies } from "next/headers";

import { getAuthenticatedParentFromToken } from "@/lib/auth/get-authenticated-parent-from-token";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export async function getAuthenticatedParentFromSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decodedToken = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);

    return getAuthenticatedParentFromToken(sessionCookie, decodedToken);
  } catch (error) {
    console.error("Failed to verify session cookie:", error);
    return null;
  }
}
