import { describe, it, expect } from "vitest";
import {
  safeExternalUrl,
  displayHost,
  initials,
  formatRating,
  formatEventDate,
  formatEventTime,
} from "@/lib/format";

describe("URL safety", () => {
  it("accepts http(s) and rejects dangerous schemes", () => {
    expect(safeExternalUrl("https://example.com")).toBe("https://example.com/");
    expect(safeExternalUrl("http://a.co/x")).toBe("http://a.co/x");
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("data:text/html,x")).toBeNull();
    expect(safeExternalUrl("not a url")).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
  });

  it("displayHost strips protocol and www", () => {
    expect(displayHost("https://www.example.com/path")).toBe("example.com");
    expect(displayHost("javascript:alert(1)")).toBeNull();
  });
});

describe("display helpers", () => {
  it("initials takes up to 2 letters", () => {
    expect(initials("Demo Member")).toBe("DM");
    expect(initials("Reyash")).toBe("R");
    expect(initials("a b c d")).toBe("AB");
  });

  it("formatRating always has two decimals", () => {
    expect(formatRating(5)).toBe("5.00");
    expect(formatRating(4.5)).toBe("4.50");
  });
});

describe("event time formatting (Asia/Kolkata)", () => {
  it("renders IST time from a UTC instant", () => {
    // 13:00 UTC -> 18:30 IST (am/pm casing varies by ICU locale data)
    const t = formatEventTime("2026-03-14T13:00:00Z").toLowerCase().replace(/\s/g, "");
    expect(t).toBe("6:30pm");
  });
  it("renders a readable date containing the year and month", () => {
    const d = formatEventDate("2026-03-14T13:00:00Z");
    expect(d).toContain("2026");
    expect(d).toContain("Mar");
  });
});
