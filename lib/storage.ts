import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

// On Netlify, the filesystem is not persistent, so uploaded room photos are
// stored in Netlify Blobs instead. Everywhere else (local dev, self-hosted),
// they're written to a local folder next to the database.
const IS_NETLIFY = process.env.NETLIFY === "true";
const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

if (!IS_NETLIFY) {
  fsSync.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export function contentTypeFor(filename: string): string | null {
  const ext = path.extname(filename).toLowerCase();
  return CONTENT_TYPES[ext] || null;
}

function blobStore() {
  return getStore("room-photos");
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export async function savePhoto(filename: string, buffer: Buffer): Promise<void> {
  if (IS_NETLIFY) {
    await blobStore().set(filename, toArrayBuffer(buffer));
  } else {
    await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);
  }
}

export async function deletePhoto(filename: string): Promise<void> {
  try {
    if (IS_NETLIFY) {
      await blobStore().delete(filename);
    } else {
      await fs.unlink(path.join(UPLOAD_DIR, filename));
    }
  } catch {
    // already gone — fine
  }
}

export async function readPhoto(filename: string): Promise<Buffer | null> {
  try {
    if (IS_NETLIFY) {
      const data = await blobStore().get(filename, { type: "arrayBuffer" });
      return data ? Buffer.from(data) : null;
    }
    return await fs.readFile(path.join(UPLOAD_DIR, filename));
  } catch {
    return null;
  }
}
