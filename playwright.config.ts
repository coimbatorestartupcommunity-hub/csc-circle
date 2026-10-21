import { defineConfig } from "@playwright/test";
import { assertSafeTestTarget } from "./scripts/e2e-staging-safety.mjs";

const mode = process.env.CSC_E2E_MODE ?? "smoke";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!supabaseUrl || !publishableKey) {
  throw new Error("E2E requires an explicit isolated Supabase URL and publishable key.");
}
const mailSinkUrl = process.env.CSC_TEST_MAIL_SINK_URL;
assertSafeTestTarget(supabaseUrl, {
  authenticated: mode === "authenticated",
  mailSinkUrl,
});
if (mode !== "smoke" && mode !== "authenticated") {
  throw new Error("CSC_E2E_MODE must be smoke or authenticated.");
}
if (mode === "authenticated" && publishableKey === "sb_publishable_e2e_smoke_placeholder") {
  throw new Error("Authenticated E2E cannot use a placeholder publishable key.");
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: process.env.CSC_E2E_MODE === "authenticated" ? 1 : 2,
  reporter: "list",
  use: { baseURL: "http://localhost:3107", headless: true, launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : undefined },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3107",
    url: "http://localhost:3107",
    // Never attach tests to an already-running server: it may have been
    // started with a different (including production) environment.
    reuseExistingServer: false,
    timeout: 60_000,
    // CI browser tests are deliberately unauthenticated. Supply a non-secret
    // placeholder and loopback-only endpoint. Authenticated E2E requires the
    // local Supabase stack's real local key and Mailpit sink via the local runner.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3107",
      CSC_E2E_MODE: mode,
      CSC_TEST_MAIL_SINK_URL: mailSinkUrl ?? "",
      EMAIL_NOTIFICATIONS_ENABLED: "false",
    },
  },
});
