import { NextResponse } from "next/server";
import { getMemberContext } from "@/lib/services/member/context";
import { createClient } from "@/lib/supabase/server";
import { authResponse } from "@/lib/auth/http";

export async function GET(_request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return authResponse({ error: "Sign in to view CSC profiles." }, 401);
  const { memberId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) return authResponse({ error: "Member profile not found." }, 404);
  const sb = await createClient();
  const { data, error } = await sb.rpc("get_discoverable_member", { p_member_id: memberId });
  if (error || !data?.[0]) return authResponse({ error: "This member profile is unavailable or not shared with the community." }, 404);
  return NextResponse.json({ member: data[0] }, { headers: { "Cache-Control": "private, no-store" } });
}
