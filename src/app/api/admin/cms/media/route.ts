import { NextResponse } from "next/server";
import { can, getAdminContext } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";

const PATH = /^(resource-media|opportunity-media|updates-media)\/[0-9a-f-]{36}\.webp$/i;

export async function GET(request: Request) {
  const context = await getAdminContext();
  if (context.mode !== "live" || !context.userId || !can(context, "content.manage")) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  const path = new URL(request.url).searchParams.get("path") ?? "";
  if (!PATH.test(path)) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  try {
    const { data, error } = await createAdminClient().storage.from("member-portraits").download(path);
    if (error || !data) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    return new Response(await data.arrayBuffer(), { headers: { "Content-Type": "image/webp", "Content-Length": String(data.size), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "Media is unavailable." }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
}
