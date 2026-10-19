import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "csc-recovery";
function key() {
  return process.env.AUTH_RECOVERY_SECRET ?? process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
}
export async function authorizeRecovery(userId: string) {
  const secret = key();
  if (!secret) return false;
  const value = Buffer.from(JSON.stringify({ userId, expires: Date.now() + 600_000 })).toString("base64url");
  const signature = createHmac("sha256", secret).update(value).digest("base64url");
  (await cookies()).set(cookieName, `${value}.${signature}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 600,
  });
  return true;
}
export async function hasRecovery(userId: string) {
  const secret = key();
  const value = (await cookies()).get(cookieName)?.value;
  if (!secret || !value) return false;
  try {
    const [payload, signature] = value.split(".");
    const expected = createHmac("sha256", secret).update(payload).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.userId === userId && data.expires > Date.now();
  } catch { return false; }
}
export async function clearRecovery() { (await cookies()).delete(cookieName); }
