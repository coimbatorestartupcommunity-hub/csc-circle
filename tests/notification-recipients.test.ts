import { describe, expect, it } from "vitest";
import { chooseNotificationRecipient } from "@/lib/notifications/recipients";

describe("notification recipient selection", () => {
  it("uses the imported registration email while an invited Auth account is still unconfirmed", () => {
    expect(chooseNotificationRecipient(null, "imported.attendee@example.com")).toBe("imported.attendee@example.com");
  });

  it("prefers a verified account email and ignores invalid candidates", () => {
    expect(chooseNotificationRecipient("member@example.com", "imported@example.com")).toBe("member@example.com");
    expect(chooseNotificationRecipient("", "not-an-email", "source@example.com")).toBe("source@example.com");
  });
});
