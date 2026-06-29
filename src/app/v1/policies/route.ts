import { NextResponse } from "next/server";

import { getApprovalRules } from "@/lib/tether/read-model";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({ rules: await getApprovalRules() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown policies error" },
      { status: 500 },
    );
  }
}
