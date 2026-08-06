import { NextRequest, NextResponse } from "next/server";
import { getYearSummary } from "@/lib/summary";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  if (!year) {
    return NextResponse.json({ error: "year is required" }, { status: 400 });
  }
  const summary = getYearSummary(year);
  return NextResponse.json(summary);
}
