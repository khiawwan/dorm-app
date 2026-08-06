import { NextRequest, NextResponse } from "next/server";
import { deleteRoom, updateRoom } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const room = updateRoom(Number(id), body);
  return NextResponse.json(room);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteRoom(Number(id));
  return NextResponse.json({ ok: true });
}
