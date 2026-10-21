const PRODUCTION_SUPABASE_REF = "mmsrtfktwcrbyrucjmzo";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const SENSITIVE_ENV_NAME = /(?:^NEXT_PUBLIC_SUPABASE_|^SUPABASE_|^DATABASE_URL$|^DIRECT_URL$|^POSTGRES_|^PG(?:HOST|PORT|USER|PASSWORD|DATABASE|CONNECTION|SERVICE)\b|^SMTP_|^MAIL(?:_|$)|^EMAIL_|^RESEND_|^SENDGRID_|^POSTMARK_|^MAILGUN_|^AUTH_RECOVERY_SECRET$|^APP_BASE_URL$|^CSC_ADMIN_NOTIFICATION_EMAILS$|^VERCEL_|^GITHUB_TOKEN$|^AWS_(?:ACCESS_KEY|SECRET|SESSION)|^GOOGLE_.*(?:KEY|SECRET|TOKEN)$|(?:_KEY|_SECRET|_TOKEN|_PASSWORD|_CREDENTIALS)$)/i;

/**
 * Reject test targets that could reach CSC production or an unverified cloud project.
 * Current Phase 2 E2E runs are deliberately restricted to the local Supabase stack.
 * @param {string | undefined} value
 * @param {{ authenticated?: boolean, mailSinkUrl?: string }} [options]
 */
export function assertSafeTestTarget(value, options = {}) {
  if (!value) throw new Error("An explicit Supabase test URL is required.");
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("The Supabase test URL must be valid.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("The Supabase test URL must not contain credentials or tokens.");
  }

  const hostname = url.hostname.toLowerCase();
  const projectRef = hostname.endsWith(".supabase.co") ? hostname.slice(0, -".supabase.co".length) : null;
  if (projectRef === PRODUCTION_SUPABASE_REF) {
    throw new Error("E2E is blocked: the configured Supabase target is CSC production.");
  }

  const local = LOOPBACK_HOSTS.has(hostname) && url.port === "54321" && url.protocol === "http:";
  if (!local) {
    throw new Error("E2E is restricted to the verified loopback Supabase stack until a separate cloud staging project is approved and wired.");
  }

  if (options.authenticated) {
    if (!options.mailSinkUrl) throw new Error("Authenticated E2E requires the isolated local Mailpit sink.");
    let mailSink;
    try {
      mailSink = new URL(options.mailSinkUrl);
    } catch {
      throw new Error("The configured E2E mail sink URL is invalid.");
    }
    if (mailSink.username || mailSink.password || mailSink.search || mailSink.hash ||
      !LOOPBACK_HOSTS.has(mailSink.hostname.toLowerCase()) || mailSink.port !== "54324" || mailSink.protocol !== "http:") {
      throw new Error("Authenticated E2E mail must be captured by loopback Mailpit on port 54324.");
    }
  }

  return Object.freeze({ local: true, projectRef: "local" });
}

/** Parse Supabase CLI env output without printing it. @param {string} output */
export function parseSupabaseStatus(output) {
  const values = {};
  for (const line of output.split(/\r?\n/)) {
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
}

/** Validate the local Supabase URL and database URL before E2E secrets are passed to Next. */
export function assertLocalSupabaseStatus(status) {
  assertSafeTestTarget(status.API_URL);
  let databaseUrl;
  try {
    databaseUrl = new URL(status.DB_URL.replace(/^postgresql:/, "http:"));
  } catch {
    throw new Error("Supabase local database status is invalid.");
  }
  if (databaseUrl.protocol !== "http:" || databaseUrl.username !== "postgres" || databaseUrl.pathname !== "/postgres" ||
    databaseUrl.search || databaseUrl.hash || !LOOPBACK_HOSTS.has(databaseUrl.hostname.toLowerCase()) || databaseUrl.port !== "54322") {
    throw new Error("Supabase local database is not bound to the expected local port.");
  }
  if (!status.PUBLISHABLE_KEY && !status.ANON_KEY) throw new Error("Supabase local publishable key is unavailable.");
  if (!status.SERVICE_ROLE_KEY) throw new Error("Supabase local service key is unavailable.");
  return true;
}

/**
 * Construct a subprocess environment that can only reach the local CSC stack.
 * Variables loaded later by Next from dotenv files are shadowed with empty
 * values when their names could carry a database, provider, or platform secret.
 * @param {NodeJS.ProcessEnv} sourceEnv
 * @param {Record<string, string>} local
 * @param {string[]} [dotenvKeys]
 */
export function createLocalE2EEnvironment(sourceEnv, local, dotenvKeys = []) {
  assertLocalSupabaseStatus(local);
  assertSafeTestTarget(local.API_URL, { authenticated: true, mailSinkUrl: local.MAILPIT_URL });
  const env = { ...sourceEnv };
  for (const key of Object.keys(env)) {
    if (SENSITIVE_ENV_NAME.test(key)) delete env[key];
  }
  for (const key of dotenvKeys) {
    if (SENSITIVE_ENV_NAME.test(key)) env[key] = "";
  }

  Object.assign(env, {
    NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.PUBLISHABLE_KEY ?? local.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
    // Some server-only helpers still accept the newer Supabase secret-key
    // variable. Give them only the same local service credential.
    SUPABASE_SECRET_KEY: local.SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SITE_URL: "http://localhost:3107",
    APP_BASE_URL: "http://localhost:3107",
    CSC_E2E_MODE: "authenticated",
    CSC_TEST_MAIL_SINK_URL: local.MAILPIT_URL,
    EMAIL_NOTIFICATIONS_ENABLED: "false",
  });
  return env;
}

/** Read dotenv assignment names only; values are never loaded or logged here. */
export function dotenvAssignmentNames(contents) {
  return [...contents.matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)].map((match) => match[1]);
}
