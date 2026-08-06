import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { contentTypeFor, readPhoto } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const safeName = path.basename(filename);
  const contentType = contentTypeFor(safeName);
  if (!contentType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = await readPhoto(safeName);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
