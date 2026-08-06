import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { UPLOAD_DIR, getRoomPhotoPath, setRoomPhoto } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

async function deleteExistingPhoto(roomId: number) {
  const existing = getRoomPhotoPath(roomId);
  if (!existing) return;
  const filename = path.basename(existing);
  try {
    await fs.unlink(path.join(UPLOAD_DIR, filename));
  } catch {
    // ignore if file already missing
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const roomId = Number(id);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ไม่พบไฟล์รูปภาพ" }, { status: 400 });
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP, GIF)" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "ไฟล์ใหญ่เกินไป (สูงสุด 5MB)" }, { status: 400 });
  }

  await deleteExistingPhoto(roomId);

  const filename = `room-${roomId}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);

  const photoUrl = `/api/uploads/${filename}`;
  const room = setRoomPhoto(roomId, photoUrl);
  return NextResponse.json(room);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const roomId = Number(id);
  await deleteExistingPhoto(roomId);
  const room = setRoomPhoto(roomId, null);
  return NextResponse.json(room);
}
