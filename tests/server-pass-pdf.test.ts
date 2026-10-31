import { describe, it, expect } from "vitest";
import { generateServerEventPassPdf } from "@/lib/events/server-pass-pdf";
import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";

describe("generateServerEventPassPdf", () => {
  it("generates a valid, non-empty event pass PDF with attendee details and QR code", async () => {
    const qrBuffer = await QRCode.toBuffer("https://csc.logicintelligencetechnologies.in/verify/test-token", {
      type: "png",
      width: 440,
    });

    const pdfBuffer = await generateServerEventPassPdf({
      eventTitle: "CSC CONNECT — Edition 2",
      name: "Vikash Saravanan",
      phone: "+91 9342877474",
      email: "createwithvikash@gmail.com",
      uid: "CSC-EVT-E8D92261EC8F4507BA4ED934BFACC369",
      dateRange: "Sunday, 1 Nov 2026 · 11:30 AM – 2:30 PM IST",
      location: "TICEL Bio Park, 12th Floor, Coimbatore",
      qrBuffer,
    });

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    const pdf = await PDFDocument.load(new Uint8Array(pdfBuffer));
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toBe("CSC CONNECT — Edition 2 · Event Pass");
  });
});
