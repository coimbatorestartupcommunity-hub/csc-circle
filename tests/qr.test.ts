import { describe, it, expect } from "vitest";
import {
  buildMembershipQrPayload,
  buildEventPassQrPayload,
  qrPayloadIsOpaque,
} from "@/lib/member/qr";

describe("QR credential payloads", () => {
  it("membership and event-pass are distinct credential types", () => {
    const m = JSON.parse(buildMembershipQrPayload("tok-123"));
    const e = JSON.parse(buildEventPassQrPayload("tok-123"));
    expect(m.t).toBe("csc.membership");
    expect(e.t).toBe("csc.eventpass");
    expect(m.t).not.toBe(e.t);
    expect(m.v).toBe(1);
    expect(m.ref).toBe("tok-123");
  });

  it("carries only the opaque token (no PII)", () => {
    const payload = buildMembershipQrPayload("mbr.v1.CSC-2026-000001");
    expect(qrPayloadIsOpaque(payload)).toBe(true);
    const keys = Object.keys(JSON.parse(payload));
    expect(keys.sort()).toEqual(["ref", "t", "v"]);
  });

  it("produces distinct membership QR payloads for distinct issued tokens", () => {
    const first = buildMembershipQrPayload("1d8c7a18f9c64c4ba1810c2c7c22f2f9");
    const second = buildMembershipQrPayload("4e2a9981bb764f13a529ef1247c0b90e");
    expect(first).not.toBe(second);
    expect(JSON.parse(first).ref).not.toBe(JSON.parse(second).ref);
  });

  it("flags payloads that would leak contact fields", () => {
    expect(qrPayloadIsOpaque('{"t":"csc.membership","ref":"a@b.com"}')).toBe(false);
    expect(qrPayloadIsOpaque('{"ref":"has phone here"}')).toBe(false);
  });
});
