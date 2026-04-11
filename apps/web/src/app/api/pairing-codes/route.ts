import { randomInt } from "node:crypto";

import { children, getDb, parents } from "@guardiansense/db";
import { createPairingCodeInputSchema, PAIRING_CODE_LENGTH } from "@guardiansense/types";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedParent } from "@/lib/auth/get-authenticated-parent";
import { redis } from "@/lib/redis";

const PAIRING_CODE_TTL_MINUTES = 10;
const MAX_CODE_GENERATION_ATTEMPTS = 5;

// Types for our Redis payload
type PairingCodePayload = {
  parentId: string;
  childId: string | null;
  childName: string;
  expiresAt: string;
};

function generatePairingCode(length = PAIRING_CODE_LENGTH): string {
  return Array.from({ length }, () => randomInt(0, 10)).join("");
}

function getExpiresAt(): Date {
  return new Date(Date.now() + PAIRING_CODE_TTL_MINUTES * 60 * 1000);
}

export async function POST(request: NextRequest) {
  try {
    const authenticatedParent = await getAuthenticatedParent(request);
    const parentId = authenticatedParent.parent.id;
    const body = await request.json();
    const input = createPairingCodeInputSchema.parse(body);
    const db = getDb();

    const [parent] = await db
      .select({ id: parents.id })
      .from(parents)
      .where(eq(parents.id, parentId))
      .limit(1);

    if (!parent) {
      return NextResponse.json(
        { error: "Parent not found." },
        { status: 404 }
      );
    }

    let targetChildId: string | null = null;
    let targetChildName: string;

    if (input.childId) {
      const [existingChild] = await db
        .select({
          id: children.id,
          displayName: children.displayName,
        })
        .from(children)
        .where(
          and(
            eq(children.id, input.childId),
            eq(children.parentId, parentId),
          ),
        )
        .limit(1);

      if (!existingChild) {
        return NextResponse.json(
          { error: "Child not found." },
          { status: 404 }
        );
      }

      targetChildId = existingChild.id;
      targetChildName = existingChild.displayName;
    } else {
      targetChildName = input.childName!.trim();
    }

    const lookupKey = `pairing_lookup:${parentId}:${targetChildId || targetChildName}`;
    const existingCode = await redis.get<string>(lookupKey);

    if (existingCode) {
      const metadata = await redis.get<PairingCodePayload>(`pairing_code:${existingCode}`);
      
      if (metadata && new Date(metadata.expiresAt) > new Date()) {
        return NextResponse.json(
          {
            code: existingCode,
            expiresAt: metadata.expiresAt,
            reused: true,
            childId: metadata.childId,
            childName: metadata.childName,
            mode: metadata.childId ? "existing-child" : "new-child",
          },
          { status: 200 }
        );
      }
    }

    for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt += 1) {
      const code = generatePairingCode();
      const expiresAt = getExpiresAt();

      const codeKey = `pairing_code:${code}`;
      const payload: PairingCodePayload = {
        parentId,
        childId: targetChildId,
        childName: targetChildName,
        expiresAt: expiresAt.toISOString(),
      };

      const success = await redis.set(codeKey, payload, { 
        nx: true, 
        ex: PAIRING_CODE_TTL_MINUTES * 60 
      });

      if (success === "OK") {
        await redis.set(lookupKey, code, { 
          ex: PAIRING_CODE_TTL_MINUTES * 60 
        });

        return NextResponse.json(
          {
            code: code,
            expiresAt: payload.expiresAt,
            reused: false,
            childId: payload.childId,
            childName: payload.childName,
            mode: payload.childId ? "existing-child" : "new-child",
          },
          { status: 201 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to generate a unique pairing code. Please try again." },
      { status: 500 }
    );
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

    console.error("Failed to create pairing code:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
