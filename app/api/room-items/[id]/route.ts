import { NextRequest, NextResponse } from "next/server";
import { deleteRoomItem, updateRoomItem } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const item = updateRoomItem(Number(id), body);
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteRoomItem(Number(id));
  return NextResponse.json({ ok: true });
}
