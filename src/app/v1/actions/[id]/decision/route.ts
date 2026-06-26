import { NextResponse } from "next/server";

import { decideAction, type DecideActionInput } from "@/lib/tether/decision";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const input = (await request.json()) as DecideActionInput;
    const result = await decideAction(id, input);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown decision error",
      },
      { status: 400 },
    );
  }
}
