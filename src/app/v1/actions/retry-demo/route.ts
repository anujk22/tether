import { NextResponse } from "next/server";

import { simulateRetryProof } from "@/lib/tether/retry-proof";

export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  try {
    return NextResponse.json(await simulateRetryProof());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown retry proof error" },
      { status: 500 },
    );
  }
}
