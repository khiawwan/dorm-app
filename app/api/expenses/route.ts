import { NextRequest, NextResponse } from "next/server";
import { getMonthExpense } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  if (!year || !month) {
    return NextResponse.json({ error: "year and month are required" }, { status: 400 });
  }
  const expense = await getMonthExpense(year, month);
  return NextResponse.json(expense);
}
