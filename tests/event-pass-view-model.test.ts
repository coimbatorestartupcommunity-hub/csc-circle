import { describe, expect, it } from "vitest";
import { eventPassViewModel } from "@/lib/member/event-pass-view-model";

describe("event pass mandatory fields", () => {
  it("always produces labeled-field values, combining venue and address", () => {
    expect(eventPassViewModel({
      memberName: "  Asha Rao  ",
      reference: "CSC-EVT-1234567890ABCDEF1234",
      venue: "TICEL Bio Park",
      location: "12th Floor, Coimbatore",
    })).toEqual({
      name: "Asha Rao",
      uid: "CSC-EVT-1234567890ABCDEF1234",
      location: "TICEL Bio Park, 12th Floor, Coimbatore",
      email: "Email unavailable",
      phone: "Phone unavailable",
    });
  });

  it("handles absent legacy values without rendering blanks", () => {
    const fields = eventPassViewModel({ memberName: "", reference: "", venue: "", location: "" });
    expect(fields.name).toBeTruthy();
    expect(fields.uid).toBeTruthy();
    expect(fields.location).toBeTruthy();
  });
});
