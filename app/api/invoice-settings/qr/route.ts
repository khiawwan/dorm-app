import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getInvoiceQrPath, setInvoiceQr } from "@/lib/db";
import { deletePhoto, savePhoto } from "@/lib/storage";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

async function deleteExistingQr() {
  const existing = await getInvoiceQrPath();
  if (!existing) return;
  await deletePhoto(path.basename(existing));
}

export async function POST(req: NextRequest) {
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

  await deleteExistingQr();

  const filename = `invoice-qr-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await savePhoto(filename, buffer);

  const settings = await setInvoiceQr(`/api/uploads/${filename}`);
  return NextResponse.json(settings);
}

export async function DELETE() {
  await deleteExistingQr();
  const settings = await setInvoiceQr(null);
  return NextResponse.json(settings);
}
