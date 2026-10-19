"use client";
export async function memberRequest(action: string, values: object): Promise<{ ok?: boolean; id?: string; error?: string }> {
  try {
    const response = await fetch(`/api/member/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    return await response.json();
  } catch { return { error: "Could not connect. Please try again." }; }
}
