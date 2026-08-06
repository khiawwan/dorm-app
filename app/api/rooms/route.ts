import { NextRequest, NextResponse } from "next/server";
import { createRoom, listRooms } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rooms = listRooms(true);
  return NextResponse.json(rooms);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const room = createRoom(body);
  return NextResponse.json(room, { status: 201 });
}
