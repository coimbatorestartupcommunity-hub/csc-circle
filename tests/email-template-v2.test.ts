// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderMerakiEditorialEmail } from "@/lib/notifications/template-meraki";
import { renderNomuShowcaseEmail } from "@/lib/notifications/template-nomu";
import { CSC_7_LEADERS } from "@/lib/notifications/email-components";

describe("CSC Circle Master Email Templates (Meraki & Nomu)", () => {
  const base = "https://csc.example.test";
  const support = "coimbatorestartupcommunity@gmail.com";

  it("verifies all 7 Core Leaders are registered with correct roles and portraits", () => {
    expect(CSC_7_LEADERS).toHaveLength(7);
    const names = CSC_7_LEADERS.map((l) => l.name);
    expect(names).toEqual([
      "K. N. Reyash",
      "E. R. Sharan",
      "Mirra Mahendran",
      "Vikash Saravanan",
      "Swathi",
      "Kishore C",
      "Jaibharath V",
    ]);

    const roles = CSC_7_LEADERS.map((l) => l.role);
    expect(roles).toEqual([
      "Founder",
      "Co-Founder",
      "CEO",
      "CTO",
      "CCO",
      "COO",
      "CBO",
    ]);
  });

  it("renders Template A (Meraki Editorial Journal) with candy stripes, polaroid, paper card, and all 7 leaders", () => {
    const html = renderMerakiEditorialEmail({
      base,
      support,
      headline: "Welcome to Coimbatore Startup Community",
      headlineItalic: "Building Coimbatore's Leading Founder Cohort",
      greeting: "Hello Founder,",
      body: "Welcome to Coimbatore Startup Community. You are now part of our growing ecosystem.",
      buttonText: "Explore Community",
      buttonUrl: `${base}/events`,
    });

    // Structure checks
    expect(html).toContain("max-width:600px");
    expect(html).toContain("/brand/csc-icon.png");
    expect(html).toContain("COIMBATORE STARTUP COMMUNITY");
    expect(html).toContain("The Biggest Step");
    expect(html).toContain("Consistency matters more than frequency");
    expect(html).toContain("repeating-linear-gradient(90deg, #8A9A5B 0px, #8A9A5B 24px, #FAF7F0 24px, #FAF7F0 48px)");

    // All 7 leaders verified
    for (const leader of CSC_7_LEADERS) {
      expect(html).toContain(leader.name);
      expect(html).toContain(leader.role);
      expect(html).toContain(leader.portrait);
    }

    // Circular social badges matching the website footer
    expect(html).toContain("whatsapp-circle.png");
    expect(html).toContain("whatsapp-agent-circle.png");
    expect(html).toContain("linkedin-circle.png");
    expect(html).toContain("instagram-circle.png");

    // Connect. Build. Grow.
    expect(html).toContain("Connect. Build. Grow.");
  });

  it("renders Template B (Nomu High-Conversion Showcase) with dripping wavy SVG, pill CTA, and all 7 leaders", () => {
    const html = renderNomuShowcaseEmail({
      base,
      support,
      variant: "blue",
      mainTitle: "Registration Confirmed",
      subtitle: "CSC Connect Edition · Coimbatore Innovation Hub",
      greeting: "Hello Member,",
      body: "Your seat for the event is confirmed.",
      primaryButtonText: "Claim Your Pass",
      primaryButtonUrl: `${base}/profile/events`,
    });

    // Structure checks
    expect(html).toContain("max-width:600px");
    expect(html).toContain("csc circle.");
    expect(html).toContain("COIMBATORE STARTUP COMMUNITY");
    expect(html).toContain("<svg viewBox=\"0 0 600 50\""); // Dripping border SVG
    expect(html).toContain("Registration Confirmed");
    expect(html).toContain("Claim Your Pass");

    // All 7 leaders verified
    for (const leader of CSC_7_LEADERS) {
      expect(html).toContain(leader.name);
      expect(html).toContain(leader.role);
      expect(html).toContain(leader.portrait);
    }

    // Circular social badges matching the website footer
    expect(html).toContain("whatsapp-circle.png");
    expect(html).toContain("whatsapp-agent-circle.png");
    expect(html).toContain("linkedin-circle.png");
    expect(html).toContain("instagram-circle.png");

    // Connect. Build. Grow.
    expect(html).toContain("Connect. Build. Grow.");
  });
});
