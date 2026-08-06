import { NextRequest, NextResponse } from "next/server";
import { addRoomItem } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const roomId = Number(body.room_id);
  if (!roomId) {
    return NextResponse.json({ error: "room_id is required" }, { status: 400 });
  }
  const item = addRoomItem(roomId, {
    name: body.name || "",
    quantity: body.quantity ?? 1,
    note: body.note ?? null,
  });
  return NextResponse.json(item, { status: 201 });
}
