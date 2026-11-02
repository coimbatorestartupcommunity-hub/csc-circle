import { describe, it, expect } from "vitest";
import { generateOrderReference, buildUpiUri, buildPaymentDeepLinks } from "@/lib/payments/orders";
import { UPI_CONFIG } from "@/lib/payments/config";

describe("UPI Payment Orders and Deep Link Generation", () => {
  it("generates a valid CSC order reference format", () => {
    const ref = generateOrderReference();
    expect(ref).toMatch(/^CSC-ORD-[0-9A-F]{12}$/);
  });

  it("builds a standards-compliant UPI payment URI with exact amount and parameters", () => {
    const uri = buildUpiUri({
      vpa: "9342877474@ptyes",
      payeeName: "S VIKASH",
      amountRupees: 180,
      orderReference: "CSC-ORD-ABCDEF123456",
      eventTitle: "CSC CONNECT — Edition 2",
    });

    expect(uri).toContain("upi://pay?");
    expect(uri).toContain("pa=9342877474%40ptyes");
    expect(uri).toContain("pn=S+VIKASH");
    expect(uri).toContain("am=180.00");
    expect(uri).toContain("cu=INR");
    expect(uri).toContain("tr=CSC-ORD-ABCDEF123456");
    expect(uri).toContain("tn=Pass+for+CSC+CONNECT");
  });

  it("constructs application-specific deep links for Google Pay, PhonePe, Paytm, and BHIM", () => {
    const uri = buildUpiUri({
      vpa: UPI_CONFIG.PAYEE_VPA,
      payeeName: UPI_CONFIG.PAYEE_NAME,
      amountRupees: 360,
      orderReference: "CSC-ORD-998877AABBCC",
      eventTitle: "CSC Founder Meetup",
    });

    const links = buildPaymentDeepLinks(uri);
    expect(links.standardUpi).toBe(uri);
    expect(links.gpay.startsWith("gpay://upi/pay?")).toBe(true);
    expect(links.phonepe.startsWith("phonepe://pay?")).toBe(true);
    expect(links.paytm.startsWith("paytmmp://pay?")).toBe(true);
    expect(links.bhim.startsWith("bhim://pay?")).toBe(true);
    expect(links.gpay).toContain("am=360.00");
  });
});
