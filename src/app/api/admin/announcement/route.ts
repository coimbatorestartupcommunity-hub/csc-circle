import { authResponse } from "@/lib/auth/http";

/** Retired legacy singleton endpoint. Event promotions now reference events by UUID. */
export async function GET() {
  return authResponse({ error: "This legacy event notice was retired. Use event notice management." }, 410);
}

export async function POST() {
  return authResponse({ error: "This legacy event notice was retired. Use event notice management." }, 410);
}
