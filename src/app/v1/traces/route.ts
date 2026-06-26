import { NextResponse } from "next/server";

import { getTraces } from "@/lib/tether/read-model";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({ traces: await getTraces() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown traces error" },
      { status: 500 },
    );
  }
}
