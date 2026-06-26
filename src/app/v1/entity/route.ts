import { NextResponse } from "next/server";

import { getEntitySnapshot, getEntityVersions } from "@/lib/tether/read-model";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const [entity, versions] = await Promise.all([
      getEntitySnapshot(),
      getEntityVersions(),
    ]);
    return NextResponse.json({ entity, versions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown entity error" },
      { status: 500 },
    );
  }
}
