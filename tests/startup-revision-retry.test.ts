import { describe, expect, it } from "vitest";
import { isExactPendingStartupRevisionRetry } from "@/lib/member/startup-revision-retry";

describe("isExactPendingStartupRevisionRetry", () => {
  const proposed = { name: "Example Startup", details: { city: "Coimbatore", skills: ["AI", "Robotics"] } };
  const privateDetails = { companyEmail: "hello@example.test" };

  it("acknowledges only the same pending revision regardless of JSON object key order", () => {
    expect(isExactPendingStartupRevisionRetry({
      status: "pending",
      proposed_data: { details: { skills: ["AI", "Robotics"], city: "Coimbatore" }, name: "Example Startup" },
      proposed_private_details: privateDetails,
    }, proposed, privateDetails)).toBe(true);
  });

  it("does not acknowledge changed content or a non-pending revision", () => {
    expect(isExactPendingStartupRevisionRetry({ status: "pending", proposed_data: { ...proposed, name: "Changed" }, proposed_private_details: privateDetails }, proposed, privateDetails)).toBe(false);
    expect(isExactPendingStartupRevisionRetry({ status: "approved", proposed_data: proposed, proposed_private_details: privateDetails }, proposed, privateDetails)).toBe(false);
    expect(isExactPendingStartupRevisionRetry({ status: "pending", proposed_data: proposed, proposed_private_details: { companyEmail: "different@example.test" } }, proposed, privateDetails)).toBe(false);
  });
});
