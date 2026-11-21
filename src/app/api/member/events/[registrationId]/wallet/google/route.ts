import { NextResponse } from "next/server";
import { memberServices } from "@/lib/services/member/services";
import { buildEventPassQrPayload } from "@/lib/member/qr";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  const { registrationId } = await params;
  const passRes = await memberServices.getPass(registrationId);
  if (!passRes.ok) {
    return NextResponse.json({ error: passRes.error.message }, { status: 403 });
  }

  const pass = passRes.data;
  const qrPayload = buildEventPassQrPayload(pass.verificationToken);

  const passRef = pass.reference || pass.registrationId;
  const googleEventPass = {
    id: `csc_event_${passRef.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
    classId: "csc_circle_event_pass",
    logoText: "CSC EVENTS",
    eventName: pass.eventTitle,
    ticketHolderName: pass.memberName,
    barcode: {
      type: "QR_CODE",
      value: qrPayload,
      alternateText: passRef,
    },
    dateTime: {
      start: pass.startsAt,
    },
    venue: {
      name: pass.venue || pass.location || "Coimbatore, Tamil Nadu",
    },
    hexBackgroundColor: "#121826",
  };

  const isConfigured = Boolean(process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY && process.env.GOOGLE_WALLET_ISSUER_ID);

  return NextResponse.json({
    ok: true,
    configured: isConfigured,
    pass: googleEventPass,
    message: isConfigured
      ? "Google Wallet integration active"
      : "Google Wallet API requires Issuer Service Account configuration. Offline Digital Pass is active.",
  });
}
