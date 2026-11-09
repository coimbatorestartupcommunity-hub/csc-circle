import { getAdminContext } from "@/lib/admin/gate";
import { getRedisDiagnostics } from "@/lib/redis/diagnostics";
import { authResponse } from "@/lib/auth/http";

/**
 * Authorized-only Redis diagnostics. Live-mode admins only; everything else
 * gets a 404 (no disclosure of module existence). Payload carries no tokens,
 * URLs, key contents, or customer data.
 */
export async function GET() {
  const context = await getAdminContext();
  if (context.mode !== "live" || context.roles.length === 0) {
    return authResponse({ error: "Not found." }, 404);
  }
  const diagnostics = await getRedisDiagnostics();
  return authResponse(diagnostics, 200);
}
