import { NextResponse } from "next/server";

import { resetDemoData } from "@/lib/demo/reset";

export const runtime = "nodejs";

export async function POST() {
  const result = await resetDemoData();

  return NextResponse.json(result);
}
