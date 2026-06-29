import { NextResponse } from "next/server";

import { getInfrastructureData } from "@/lib/tether/read-model";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json(await getInfrastructureData());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown infrastructure error",
      },
      { status: 500 },
    );
  }
}
