import { NextResponse } from "next/server";
import { getAdminContext, can } from "@/lib/admin/gate";
import {
  getWhatsAppLockConfig,
  setWhatsAppLockConfig,
  getWebsiteMaintenanceConfig,
  setWebsiteMaintenanceConfig,
} from "@/lib/services/system-settings";

export async function GET() {
  const ctx = await getAdminContext();
  if (ctx.mode !== "preview" && !can(ctx, "settings.manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [whatsappLock, websiteMaintenance] = await Promise.all([
    getWhatsAppLockConfig(),
    getWebsiteMaintenanceConfig(),
  ]);

  return NextResponse.json({
    whatsappLock,
    websiteMaintenance,
  });
}

export async function POST(request: Request) {
  const ctx = await getAdminContext();
  if (ctx.mode !== "preview" && !can(ctx, "settings.manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const action = body?.action;

    if (action === "update_whatsapp_lock") {
      const { locked, unlockEpochMs, reason, tamilReason } = body;
      const updated = await setWhatsAppLockConfig({
        locked: Boolean(locked),
        unlockEpochMs: typeof unlockEpochMs === "number" ? unlockEpochMs : Date.now() + 24 * 60 * 60 * 1000,
        reason: typeof reason === "string" ? reason : undefined,
        tamilReason: typeof tamilReason === "string" ? tamilReason : undefined,
        updatedBy: ctx.displayName || "admin",
      });
      return NextResponse.json({ ok: true, whatsappLock: updated });
    }

    if (action === "update_website_maintenance") {
      const { enabled, unlockEpochMs, title, message, tamilTitle, tamilMessage, contactEmail, allowAdminBypass } = body;
      const updated = await setWebsiteMaintenanceConfig({
        enabled: Boolean(enabled),
        unlockEpochMs: typeof unlockEpochMs === "number" ? unlockEpochMs : null,
        title: typeof title === "string" ? title : undefined,
        message: typeof message === "string" ? message : undefined,
        tamilTitle: typeof tamilTitle === "string" ? tamilTitle : undefined,
        tamilMessage: typeof tamilMessage === "string" ? tamilMessage : undefined,
        contactEmail: typeof contactEmail === "string" ? contactEmail : undefined,
        allowAdminBypass: allowAdminBypass !== undefined ? Boolean(allowAdminBypass) : true,
        updatedBy: ctx.displayName || "admin",
      });
      return NextResponse.json({ ok: true, websiteMaintenance: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update configuration" },
      { status: 500 }
    );
  }
}
