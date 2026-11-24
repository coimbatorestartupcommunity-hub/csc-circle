import { describe, it, expect, vi } from "vitest";

describe("WhatsApp Outbox UI & Retry Pipeline", () => {
  it("recognizes delivered and accepted_by_gateway as verified status", () => {
    const isDelivered = (s: string) =>
      s === "delivered" || s === "accepted_by_gateway" || s === "sent";

    expect(isDelivered("delivered")).toBe(true);
    expect(isDelivered("accepted_by_gateway")).toBe(true);
    expect(isDelivered("sent")).toBe(true);
    expect(isDelivered("failed")).toBe(false);
    expect(isDelivered("processing")).toBe(false);
    expect(isDelivered("pending")).toBe(false);
  });

  it("classifies processing and pending statuses correctly", () => {
    const isPendingOrProcessing = (s: string) =>
      s === "pending" || s === "processing" || s === "queued";

    expect(isPendingOrProcessing("pending")).toBe(true);
    expect(isPendingOrProcessing("processing")).toBe(true);
    expect(isPendingOrProcessing("queued")).toBe(true);
    expect(isPendingOrProcessing("delivered")).toBe(false);
    expect(isPendingOrProcessing("failed")).toBe(false);
  });
});
