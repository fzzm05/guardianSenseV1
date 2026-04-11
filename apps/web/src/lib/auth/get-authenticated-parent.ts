import { NextRequest } from "next/server";

import { getAuthenticatedParentFromToken } from "@/lib/auth/get-authenticated-parent-from-token";

function getBearerToken(request: NextRequest): string {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header.");
  }

  return authorization.slice("Bearer ".length);
}

export async function getAuthenticatedParent(request: NextRequest) {
  const idToken = getBearerToken(request);

  return getAuthenticatedParentFromToken(idToken);
}
