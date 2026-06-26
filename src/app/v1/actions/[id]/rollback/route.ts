import { NextResponse } from "next/server";

import { rollbackAction, type RollbackInput } from "@/lib/tether/rollback";

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
    const input = (await request.json()) as RollbackInput;
    const result = await rollbackAction(id, input);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown rollback error",
      },
      { status: 400 },
    );
  }
}
