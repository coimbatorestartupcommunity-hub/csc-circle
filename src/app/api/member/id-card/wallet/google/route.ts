import { NextResponse } from "next/server";
import { memberServices } from "@/lib/services/member/services";
import { buildMembershipQrPayload } from "@/lib/member/qr";

export async function GET() {
  const cardRes = await memberServices.getCard();
  if (!cardRes.ok) {
    return NextResponse.json({ error: cardRes.error.message }, { status: 403 });
  }

  const card = cardRes.data;
  const qrPayload = buildMembershipQrPayload(card.verificationToken);

  const googlePass = {
    id: `csc_member_${card.memberNumber.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
    classId: "csc_circle_membership",
    logoText: "CSC CIRCLE",
    cardTitle: card.fullName,
    subheader: card.memberNumber,
    header: card.designationLabel || "Founder",
    barcode: {
      type: "QR_CODE",
      value: qrPayload,
      alternateText: card.memberNumber,
    },
    textModulesData: [
      {
        id: "startup",
        header: "STARTUP / ORG",
        body: card.startupName || "Coimbatore Startup Community",
      },
      {
        id: "status",
        header: "STATUS",
        body: card.status.toUpperCase(),
      },
      {
        id: "offline",
        header: "OFFLINE ENTRY",
        body: "Certified for offline scan at CSC entrance kiosks.",
      },
    ],
    hexBackgroundColor: "#171B35",
  };

  const isConfigured = Boolean(process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY && process.env.GOOGLE_WALLET_ISSUER_ID);

  return NextResponse.json({
    ok: true,
    configured: isConfigured,
    pass: googlePass,
    message: isConfigured
      ? "Google Wallet integration active"
      : "Google Wallet API requires Issuer Service Account configuration. Offline Digital Pass is active.",
  });
}
