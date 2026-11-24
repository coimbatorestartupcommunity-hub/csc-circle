// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderMerakiEditorialEmail } from "@/lib/notifications/template-meraki";
import {
  CSC_7_LEADERS,
  CSC_TOP_3_LEADERS,
  CSC_BOTTOM_4_LEADERS,
} from "@/lib/notifications/email-components";

describe("CSC Circle Master MERAKI Editor Email System", () => {
  const base = "https://csc.example.test";
  const support = "coimbatorestartupcommunity@gmail.com";

  it("verifies the 3 + 4 Executive Leadership Split with full official C-suite designations", () => {
    expect(CSC_TOP_3_LEADERS).toHaveLength(3);
    expect(CSC_BOTTOM_4_LEADERS).toHaveLength(4);
    expect(CSC_7_LEADERS).toHaveLength(7);

    // Top 3 Leaders
    expect(CSC_TOP_3_LEADERS.map((l) => [l.name, l.role])).toEqual([
      ["K. N. Reyash", "FOUNDER"],
      ["E. R. Sharan", "CO-FOUNDER"],
      ["Mirra Mahendran", "CHIEF EXECUTIVE OFFICER"],
    ]);

    // Bottom 4 Leaders
    expect(CSC_BOTTOM_4_LEADERS.map((l) => [l.name, l.role])).toEqual([
      ["Vikash Saravanan", "CHIEF TECHNOLOGY OFFICER"],
      ["Swathi", "CHIEF COMMUNITY OFFICER"],
      ["Kishore C", "CHIEF OPERATING OFFICER"],
      ["Jaibharath V", "CHIEF BRAND OFFICER"],
    ]);
  });

  it("renders Master Template A (MERAKI Editor) with 100% fluid mobile responsiveness, 7 leaders, partner badge, and 7 governance links", () => {
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

    // Mobile responsiveness meta tag & styles
    expect(html).toContain('name="viewport" content="width=device-width, initial-scale=1.0');
    expect(html).toContain("max-width:600px");
    expect(html).toContain("/brand/csc-icon.png");
    expect(html).toContain("COIMBATORE STARTUP COMMUNITY");
    expect(html).toContain("The Biggest Step");
    expect(html).toContain("Consistency matters more than frequency");

    // Leadership section headers
    expect(html).toContain("Guided by Coimbatore Startup Community Core Leadership");
    expect(html).toContain("All Seven Members");

    // All 7 leaders verified in 3+4 split
    for (const leader of CSC_7_LEADERS) {
      expect(html).toContain(leader.name);
      expect(html).toContain(leader.role);
      expect(html).toContain(leader.portrait);
    }

    // 3 Curated Ecosystem Story photos in footer
    expect(html).toContain("csc-connect-edition-2-cover.webp");
    expect(html).toContain("community-outlier-meetup.jpg");
    expect(html).toContain("community-outlier-poster.jpg");

    // Official Technical Partner badge (Logic Intelligence Technologies)
    expect(html).toContain("technical-partner-lit.png");
    expect(html).toContain("LOGIC INTELLIGENCE TECHNOLOGIES");
    expect(html).toContain("OFFICIAL TECHNICAL PARTNER");

    // Circular social badges matching the website footer
    expect(html).toContain("whatsapp-circle.png");
    expect(html).toContain("whatsapp-agent-circle.png");
    expect(html).toContain("linkedin-circle.png");
    expect(html).toContain("instagram-circle.png");

    // 7 Official website legal & governance links
    expect(html).toContain(`${base}/help`);
    expect(html).toContain(`${base}/contact`);
    expect(html).toContain(`${base}/community-guidelines`);
    expect(html).toContain(`${base}/membership`);
    expect(html).toContain(`${base}/privacy`);
    expect(html).toContain(`${base}/terms`);
    expect(html).toContain(`${base}/security`);

    // Standard tagline
    expect(html).toContain("Connect. Build. Grow.");
  });
});
