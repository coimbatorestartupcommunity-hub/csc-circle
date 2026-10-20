// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { definitions, renderNotification } from "@/lib/notifications/templates";
import { readFileSync, readdirSync, existsSync } from "node:fs";

const smtpEnv = {
  SMTP_HOST: "smtp.gmail.com",
  SMTP_USER: "sender@example.test",
  SMTP_APP_PASSWORD: "synthetic-only",
  CSC_SUPPORT_EMAIL: "support@example.test",
  CSC_ADMIN_NOTIFICATION_EMAILS: "admin@example.test",
  APP_BASE_URL: "https://csc.logicintelligencetechnologies.in",
};

afterEach(() => vi.unstubAllEnvs());

function configure() {
  for (const [key, value] of Object.entries(smtpEnv)) vi.stubEnv(key, value);
}

it("renders every CSC outbox type with the shared reference design and CSC identity", () => {
  configure();
  for (const key of Object.keys(definitions) as Array<keyof typeof definitions>) {
    const message = renderNotification(key, {});
    expect(message.subject).toContain("CSC Circle");
    expect(message.html).toContain("max-width:600px");
    expect(message.html).toContain("/brand/csc-icon.png");
    expect(message.html).toContain("COIMBATORE STARTUP COMMUNITY");
    expect(message.html).toContain("social-instagram.png");
    expect(message.html).toContain("social-whatsapp.png");
    expect(message.text).toContain("Connect. Build. Grow.");
    expect(message.html).not.toContain("https://www.logicintelligencetechnologies.in");
    expect(message.text).not.toContain("Logic Intelligence Technologies");
  }
});

it("renders event broadcasts with live event details, registration CTA, and escaped user content", () => {
  configure();
  const message = renderNotification("EventPublishedBroadcast", {
    name: "Founder",
    slug: "founder-meetup-2026",
    eventTitle: '<img src=x onerror="alert(1)"> Founder Meetup',
    eventCategory: "Founder Meetup",
    startsAt: "2026-10-21T10:00:00+05:30",
    venue: "Coimbatore Innovation Hub",
    admission: "free",
    registrationState: "open",
    description: "Meet the CSC founder community.",
    internalNotes: "private-moderation-note",
  });
  expect(message.subject).toContain("A new CSC event is open");
  expect(message.html).toContain("https://csc.logicintelligencetechnologies.in/events/founder-meetup-2026");
  expect(message.html).toContain("View event &amp; register");
  expect(message.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  expect(message.text).toContain("Event: <img src=x onerror=\"alert(1)\"> Founder Meetup");
  expect(message.text).not.toContain("private-moderation-note");
});

it("renders the individual event pass in the confirmed registration email", () => {
  configure();
  const message = renderNotification("EventConfirmed", {
    registrationId: "123e4567-e89b-12d3-a456-426614174000",
    eventPassQrCid: "csc-event-pass-job@example.csc",
    reference: "EVT-TEST-123",
    eventTitle: "CSC Founder Meetup",
  });
  expect(message.html).toContain("cid:csc-event-pass-job@example.csc");
  expect(message.html).toContain("Your individual event pass QR");
  expect(message.text).toContain("Your individual event pass QR is attached");
  expect(message.html).toContain("/member/events/123e4567-e89b-12d3-a456-426614174000");
});

it("keeps the production Supabase auth email templates on the CSC frame with native placeholders", () => {
  const files = readdirSync("supabase/templates").filter((file) => file.endsWith(".html"));
  expect(files).toEqual(expect.arrayContaining(["confirmation.html", "recovery.html", "invite.html", "magic_link.html", "email_change.html", "reauthentication.html"]));
  for (const file of files) {
    const html = readFileSync(`supabase/templates/${file}`, "utf8");
    expect(html).toContain("/brand/csc-icon.png");
    expect(html).toContain("coimbatorestartupcommunity@gmail.com");
    expect(html).not.toContain("https://www.logicintelligencetechnologies.in");
  }
  expect(readFileSync("supabase/templates/confirmation.html", "utf8")).toContain("{{ .ConfirmationURL }}");
  expect(readFileSync("supabase/templates/recovery.html", "utf8")).toContain("{{ .ConfirmationURL }}");
  expect(readFileSync("supabase/templates/reauthentication.html", "utf8")).toContain("{{ .Token }}");
});

it("publishes every referenced design asset to the CSC public asset tree", () => {
  for (const file of ["welcome.png", "verification.png", "campaign.png", "onboarding.png", "workspace.png", "milestone.png", "payment.png", "support.png", "maintenance.png", "nunito-sans-latin.woff2", "social-instagram.png", "social-whatsapp.png", "social-email.png", "social-website.png"]) {
    expect(existsSync(`public/email-assets/reference/${file}`)).toBe(true);
  }
});
