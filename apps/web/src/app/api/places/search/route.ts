import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedParentFromSession } from "@/lib/auth/get-authenticated-parent-from-session";

const placeSearchQuerySchema = z.object({
  q: z.string().min(2).max(120),
});

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number | string;
};

export async function GET(request: NextRequest) {
  try {
    const authenticatedParent = await getAuthenticatedParentFromSession();

    if (!authenticatedParent) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const { q } = placeSearchQuerySchema.parse({
      q: searchParams.get("q") ?? "",
    });

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "5");
    url.searchParams.set("addressdetails", "0");

    const contactEmail = process.env.NOMINATIM_CONTACT_EMAIL;

    if (contactEmail) {
      url.searchParams.set("email", contactEmail);
    }

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "GuardianSenseV1/1.0 (safe-zone-search)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to search places." },
        { status: 502 },
      );
    }

    const results = (await response.json()) as NominatimResult[];

    return NextResponse.json(
      results.map((result) => ({
        id: String(result.place_id),
        displayName: result.display_name,
        latitude: Number(result.lat),
        longitude: Number(result.lon),
      })),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid search query.",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    console.error("Failed to search places:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
