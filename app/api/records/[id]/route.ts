import { NextRequest, NextResponse } from "next/server";
import { updateRecord } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const record = updateRecord(Number(id), body);
  return NextResponse.json(record);
}
