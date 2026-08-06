import { NextRequest, NextResponse } from "next/server";
import { updateExpense } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const expense = updateExpense(Number(id), body);
  return NextResponse.json(expense);
}
