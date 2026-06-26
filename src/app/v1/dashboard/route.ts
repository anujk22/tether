import { NextResponse } from "next/server";

import { getDashboardData } from "@/lib/tether/read-model";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json(await getDashboardData());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown dashboard error" },
      { status: 500 },
    );
  }
}
