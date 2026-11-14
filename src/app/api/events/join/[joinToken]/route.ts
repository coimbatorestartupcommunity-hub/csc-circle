import { NextRequest, NextResponse } from "next/server";
import { redeemJoinSession } from "@/lib/events/check-in";
import { CSC_OFFICIAL_MEET_URL } from "@/lib/events/google-meet";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ joinToken: string }> }
) {
  const { joinToken } = await params;

  if (!joinToken) {
    return NextResponse.redirect(new URL("/events/google-meet/check-in", _req.url));
  }

  const result = await redeemJoinSession(joinToken);

  if (!result.ok || !result.meetingUrl) {
    return NextResponse.redirect(
      new URL(`/events/google-meet/check-in?error=${encodeURIComponent(result.error || "Session expired")}`, _req.url)
    );
  }

  return NextResponse.redirect(result.meetingUrl || CSC_OFFICIAL_MEET_URL, 302);
}
