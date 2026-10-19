"use client";
/** Never log payloads: these requests contain credentials. */
export async function authRequest(action: string, body: object): Promise<{ ok?: boolean; error?: string; sessionsRevoked?: boolean }> {
  try {
    const response = await fetch(`/api/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    return await response.json();
  } catch { return { error: "Could not connect. Please try again." }; }
}
