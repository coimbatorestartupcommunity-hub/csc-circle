import { NextResponse } from "next/server";
import { memberServices } from "@/lib/services/member/services";
import { buildMembershipQrPayload } from "@/lib/member/qr";
import { generateAppleMemberPass } from "@/lib/wallet/apple-pass";
import { getSubsystemMaintenanceConfig } from "@/lib/services/system-settings";

export async function GET(req: Request) {
  const subsystems = await getSubsystemMaintenanceConfig();
  if (subsystems.idCardGeneration.paused) {
    return NextResponse.json(
      {
        error: subsystems.idCardGeneration.reason || "Digital ID Card pass generation is temporarily paused for scheduled batch updates.",
        maintenance: true,
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const cardRes = await memberServices.getCard();
  if (!cardRes.ok) {
    return NextResponse.json({ error: cardRes.error.message }, { status: 403 });
  }

  const card = cardRes.data;
  const qrPayload = buildMembershipQrPayload(card.verificationToken);
  const isConfigured = Boolean(process.env.APPLE_PASS_CERT && process.env.APPLE_PASS_KEY);

  // If client explicitly requests raw pkpass download
  if (searchParams.get("download") === "pkpass") {
    try {
      const pkpassBuffer = await generateAppleMemberPass({
        memberNumber: card.memberNumber,
        fullName: card.fullName,
        designationLabel: card.designationLabel,
        startupName: card.startupName,
        status: card.status,
        qrPayload,
        issuedAt: card.issuedAt,
        expiresAt: card.expiresAt,
      });

      const filename = `CSC-Member-${card.memberNumber}.pkpass`;

      return new Response(new Uint8Array(pkpassBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.pkpass",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "private, no-cache",
        },
      });
    } catch (err) {
      console.error("Apple pass generation error:", err);
      return NextResponse.json({ error: "Failed to generate Apple Wallet pass" }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    configured: isConfigured,
    memberNumber: card.memberNumber,
    message: isConfigured
      ? "Apple Wallet pass ready"
      : "Apple Wallet requires an Apple Developer Pass Type ID certificate. Offline Digital Pass is active.",
  });
}
