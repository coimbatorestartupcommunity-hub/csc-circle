import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext, can } from "@/lib/admin/gate";
import { authResponse, isSafeOrigin, readAuthBody } from "@/lib/auth/http";
import { agreementsTable, type DigitalAgreementRow } from "@/lib/agreements/db";
import { sendAgreementInvitationEmail } from "@/lib/agreements/notify";
import { siteConfig } from "@/lib/content/site";

const patchSchema = z.object({
  action: z.enum(["void", "resend"]),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAdminContext();
  if (ctx.mode !== "live" || !can(ctx, "settings.manage")) {
    return authResponse({ error: "Unauthorized" }, 403);
  }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return authResponse({ error: "Not found" }, 404);
  const { data, error } = await agreementsTable().select("*").eq("id", id).maybeSingle();
  if (error || !data) return authResponse({ error: "Not found" }, 404);
  return NextResponse.json(
    { agreement: data as DigitalAgreementRow },
    {
      headers: {
        "Cache-Control": "private, no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAdminContext();
  if (ctx.mode !== "live" || !can(ctx, "settings.manage")) {
    return authResponse({ error: "Unauthorized" }, 403);
  }
  if (!isSafeOrigin(request)) {
    return authResponse({ error: "Request origin could not be verified." }, 403);
  }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return authResponse({ error: "Not found" }, 404);

  const body = await readAuthBody(request);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return authResponse({ error: "Invalid action." }, 422);

  const { data } = await agreementsTable().select("*").eq("id", id).maybeSingle();
  const agreement = data as DigitalAgreementRow | null;
  if (!agreement) return authResponse({ error: "Agreement not found." }, 404);

  if (parsed.data.action === "void") {
    if (agreement.status === "signed") {
      return authResponse({ error: "Signed agreements cannot be voided." }, 409);
    }
    const { data: updated, error } = await agreementsTable()
      .update({ status: "voided", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return authResponse({ error: "Could not void agreement." }, 503);
    return NextResponse.json({ agreement: updated as DigitalAgreementRow });
  }

  if (agreement.status !== "sent" && agreement.status !== "opened") {
    return authResponse({ error: "Only pending or opened agreements can be resent." }, 409);
  }

  const signingUrl = `${siteConfig.url}/agreements/sign/${agreement.signing_token}`;
  await sendAgreementInvitationEmail({
    recipientEmail: agreement.recipient_email,
    recipientName: agreement.recipient_name,
    title: agreement.title,
    referenceCode: agreement.reference_code,
    signingUrl,
  });

  return NextResponse.json({ ok: true, signingUrl });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAdminContext();
  if (ctx.mode !== "live" || !can(ctx, "settings.manage")) {
    return authResponse({ error: "Unauthorized" }, 403);
  }
  if (!isSafeOrigin(request)) {
    return authResponse({ error: "Request origin could not be verified." }, 403);
  }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return authResponse({ error: "Not found" }, 404);

  const { data } = await agreementsTable().select("*").eq("id", id).maybeSingle();
  const agreement = data as DigitalAgreementRow | null;
  if (!agreement) return authResponse({ error: "Agreement not found." }, 404);

  // If partner logo was stored, clean it up
  if (agreement.partner_logo_path) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      await createAdminClient()
        .storage.from("agreement-assets")
        .remove([agreement.partner_logo_path]);
    } catch {
      // Best-effort cleanup
    }
  }

  const { error } = await agreementsTable().delete().eq("id", id);
  if (error) {
    return authResponse({ error: "Failed to delete agreement: " + error.message }, 500);
  }

  return NextResponse.json({ ok: true, deletedId: id });
}
