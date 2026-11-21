import { NextResponse } from "next/server";
import { memberServices } from "@/lib/services/member/services";
import { buildEventPassQrPayload } from "@/lib/member/qr";
import { generateAppleEventPass } from "@/lib/wallet/apple-pass";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  const { searchParams } = new URL(req.url);
  const { registrationId } = await params;
  const passRes = await memberServices.getPass(registrationId);
  if (!passRes.ok) {
    return NextResponse.json({ error: passRes.error.message }, { status: 403 });
  }

  const pass = passRes.data;
  const qrPayload = buildEventPassQrPayload(pass.verificationToken);
  const isConfigured = Boolean(process.env.APPLE_PASS_CERT && process.env.APPLE_PASS_KEY);

  // If client explicitly requests raw pkpass download
  if (searchParams.get("download") === "pkpass") {
    try {
      const pkpassBuffer = await generateAppleEventPass({
        registrationId: pass.registrationId,
        eventTitle: pass.eventTitle,
        attendeeName: pass.memberName,
        startsAt: pass.startsAt,
        venueName: pass.venue || pass.location,
        qrPayload,
        passUid: pass.reference,
      });

      const filename = `CSC-EventPass-${pass.reference}.pkpass`;

      return new Response(new Uint8Array(pkpassBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.pkpass",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "private, no-cache",
        },
      });
    } catch (err) {
      console.error("Apple event pass generation error:", err);
      return NextResponse.json({ error: "Failed to generate Apple Wallet event pass" }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    configured: isConfigured,
    reference: pass.reference,
    message: isConfigured
      ? "Apple Wallet event pass ready"
      : "Apple Wallet requires an Apple Developer Pass Type ID certificate. Offline Digital Pass is active.",
  });
}
