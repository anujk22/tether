import { NextResponse } from "next/server";

import { proposeAction, type ProposeActionInput } from "@/lib/tether/propose";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const input = (await request.json()) as ProposeActionInput;
    const result = await proposeAction(input);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown propose error",
      },
      { status: 400 },
    );
  }
}
