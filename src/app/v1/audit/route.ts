import { NextResponse } from "next/server";

import { getAuditEvents } from "@/lib/tether/read-model";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({ auditEvents: await getAuditEvents() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown audit error" },
      { status: 500 },
    );
  }
}
