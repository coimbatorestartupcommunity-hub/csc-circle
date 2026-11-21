import { NextResponse } from "next/server";
import { memberServices } from "@/lib/services/member/services";
import { buildMembershipQrPayload } from "@/lib/member/qr";
import { generateAppleMemberPass } from "@/lib/wallet/apple-pass";

export async function GET() {
  const cardRes = await memberServices.getCard();
  if (!cardRes.ok) {
    return NextResponse.json({ error: cardRes.error.message }, { status: 403 });
  }

  const card = cardRes.data;
  const qrPayload = buildMembershipQrPayload(card.verificationToken);

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
