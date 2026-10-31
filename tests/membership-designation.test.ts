import { describe, expect, it } from "vitest";
import { membershipDesignationLabel } from "@/lib/member/membership-designation";

describe("membership ID designation label", () => {
  it.each([
    ["aspiring_entrepreneur", "Aspiring Entrepreneur"],
    ["student_entrepreneur", "Student Entrepreneur"],
    ["marketing", "Marketing Professional"],
    ["startup_founder", "Startup Founder"],
    ["team_member", "Startup Team Member"],
    ["mentor", "Mentor"],
  ])("shows the approved %s category instead of Other", (designation, label) => {
    expect(membershipDesignationLabel(["other"], designation)).toBe(label);
  });

  it("shows all specific profile categories and removes Other", () => {
    expect(membershipDesignationLabel(["other", "startup_founder", "mentor", "startup_founder"], "student_entrepreneur"))
      .toBe("Startup Founder · Mentor");
  });

  it("keeps Other only when no specific selection exists", () => {
    expect(membershipDesignationLabel(["other"], "other")).toBe("Other");
    expect(membershipDesignationLabel([], null)).toBe("CSC Member");
  });

  it("uses the member's custom Other label on the membership ID", () => {
    expect(membershipDesignationLabel(["other"], "other", "Community Builder", "Legacy Label"))
      .toBe("Community Builder");
    expect(membershipDesignationLabel(["other"], "other", null, "Ecosystem Enabler"))
      .toBe("Ecosystem Enabler");
  });

  it("shows a custom Other label alongside selected standard categories", () => {
    expect(membershipDesignationLabel(["startup_founder", "other"], null, "Angel Scout"))
      .toBe("Startup Founder · Angel Scout");
  });
});
