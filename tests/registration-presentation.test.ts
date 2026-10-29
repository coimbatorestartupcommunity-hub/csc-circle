import { describe, expect, it } from "vitest";
import { getPaidRegistrationPresentation } from "@/lib/events/registration-presentation";

describe("paid registration status presentation", () => {
  it("shows the issued event pass state and download action", () => {
    expect(getPaidRegistrationPresentation("pass")).toEqual({
      heading: "You have already registered",
      message: "You have already registered and you already have your Event pass.",
      passReady: true,
    });
  });

  it("explains that a reviewed registration is pending CSC confirmation", () => {
    const pending = getPaidRegistrationPresentation("pending");
    expect(pending.heading).toBe("You have already registered");
    expect(pending.message).toContain("CSC confirmation is pending");
    expect(pending.passReady).toBe(false);
  });

  it("keeps the attendee on the page while pass confirmation is being prepared", () => {
    const pending = getPaidRegistrationPresentation("confirmation_pending");
    expect(pending.message).toContain("Your confirmation is pending");
    expect(pending.passReady).toBe(false);
  });
});
