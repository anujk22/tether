import { NextResponse } from "next/server";

import { getActions } from "@/lib/tether/read-model";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({ actions: await getActions() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown actions error" },
      { status: 500 },
    );
  }
}
