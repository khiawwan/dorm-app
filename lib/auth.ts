const USERNAME = process.env.ADMIN_USERNAME || "admin";
const PASSWORD = process.env.ADMIN_PASSWORD || "saharut@kw";
const SECRET = process.env.AUTH_SECRET || "dorm-kheawwan-dev-secret-change-me";

export const SESSION_COOKIE = "dorm_session";
const SESSION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

async function hmac(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function checkCredentials(username: string, password: string): boolean {
  return username === USERNAME && password === PASSWORD;
}

export async function createSessionToken(username: string): Promise<string> {
  const expiry = Date.now() + SESSION_MS;
  const payload = `${username}.${expiry}`;
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [username, expiryStr, sig] = parts;
  const expected = await hmac(`${username}.${expiryStr}`);
  if (expected !== sig) return false;
  const expiry = Number(expiryStr);
  if (!expiry || Date.now() > expiry) return false;
  return true;
}

export const SESSION_MAX_AGE_SECONDS = SESSION_MS / 1000;
