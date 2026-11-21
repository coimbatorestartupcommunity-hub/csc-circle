// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockRegistrations = new Map<string, any>();
const mockAttendance = new Map<string, any>();
const mockJoinSessions = new Map<string, any>();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: (col: string, val: any) => ({
          maybeSingle: async () => {
            if (table === "event_registrations") {
              for (const r of mockRegistrations.values()) {
                if (r[col] === val) return { data: r, error: null };
              }
              return { data: null, error: null };
            }
            return { data: null, error: null };
          },
        }),
      }),
      insert: async (data: any) => {
        if (table === "event_join_sessions") {
          mockJoinSessions.set(data.token_hash, data);
        }
        return { data, error: null };
      },
      update: () => ({
        eq: (col: string, val: any) => {
          if (table === "event_registrations") {
            for (const [k, v] of mockRegistrations.entries()) {
              if (v[col] === val) mockRegistrations.set(k, { ...v, status: "checked_in" });
            }
          }
          return Promise.resolve({ error: null });
        },
      }),
    }),
    rpc: async (fn: string, args: any) => {
      if (fn === "csc_attendee_self_check_in") {
        const token = args.p_pass_token;
        const reg = Array.from(mockRegistrations.values()).find((r) => r.pass_token === token || r.reference === token);
        if (!reg) return { data: { ok: false, status: "invalid" }, error: null };
        const already = mockAttendance.has(reg.id);
        mockAttendance.set(reg.id, {
          registration_id: reg.id,
          method: args.p_method,
          checked_in_at: new Date().toISOString(),
        });
        reg.status = "checked_in";
        return {
          data: {
            ok: true,
            status: "valid",
            registration_id: reg.id,
            attendee_name: reg.attendee_name,
            reference: reg.reference,
            already_checked_in: already,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    },
  }),
}));

import { POST as checkInPost } from "@/app/api/events/check-in/route";

describe("Event Check-In API Route (/api/events/check-in)", () => {
  const validToken = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
  const validRef = "CSC-EVT-TEST999";

  beforeEach(() => {
    mockRegistrations.clear();
    mockAttendance.clear();
    mockJoinSessions.clear();

    mockRegistrations.set("reg-1", {
      id: "reg-1",
      event_id: "evt-joint",
      reference: validRef,
      pass_token: validToken,
      attendee_name: "Sundar Raj",
      source_email: "sundar@example.com",
      status: "confirmed",
      payment: "not_required",
      event: {
        id: "evt-joint",
        slug: "csc-joint-online-meeting",
        title: "Coimbatore Startup Community (CSC) - Joint Online Meeting",
        status: "published",
        format: "online",
        admission: "free",
        starts_at: "2026-11-22T15:00:00+05:30",
        ends_at: "2026-11-22T17:00:00+05:30",
        settings: {
          onlineInfo: "https://meet.google.com/vwg-hmsh-mrx",
        },
      },
    });
  });

  it("1. Rejects missing or malformed token (< 8 characters)", async () => {
    const req = new NextRequest("http://localhost/api/events/check-in", {
      method: "POST",
      body: JSON.stringify({ token: "123" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await checkInPost(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.status).toBe("invalid");
  });

  it("2. Returns early locked status before 1 hour window without test param", async () => {
    const req = new NextRequest("http://localhost/api/events/check-in", {
      method: "POST",
      body: JSON.stringify({ token: validToken }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await checkInPost(req);
    const body = await res.json();
    // At current time (2026-11-21), Nov 22 2:00 PM IST is in the future
    expect(res.status).toBe(425);
    expect(body.status).toBe("early");
    expect(body.opensAt).toBeDefined();
  });

  it("3. Successfully completes check-in and provides Google Meet redirect in test mode or active window", async () => {
    const req = new NextRequest("http://localhost/api/events/check-in?test=1", {
      method: "POST",
      body: JSON.stringify({ token: validToken }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await checkInPost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe("checked_in");
    expect(body.attendeeName).toBe("Sundar Raj");
    expect(body.reference).toBe(validRef);
    expect(body.meetingUrl).toBe("https://meet.google.com/vwg-hmsh-mrx");
    expect(body.countdownSeconds).toBe(2);

    // Verify registration was updated in database
    expect(mockAttendance.has("reg-1")).toBe(true);
    expect(mockRegistrations.get("reg-1").status).toBe("checked_in");
  });

  it("4. Automatically parses JSON QR payload correctly", async () => {
    const jsonQrPayload = JSON.stringify({ t: "csc.eventpass", v: 1, ref: validToken });
    const req = new NextRequest("http://localhost/api/events/check-in?test=1", {
      method: "POST",
      body: JSON.stringify({ text: jsonQrPayload }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await checkInPost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.attendeeName).toBe("Sundar Raj");
  });

  it("5. Handles repeated check-in idempotently", async () => {
    // First check-in
    const req1 = new NextRequest("http://localhost/api/events/check-in?test=1", {
      method: "POST",
      body: JSON.stringify({ token: validToken }),
      headers: { "Content-Type": "application/json" },
    });
    const res1 = await checkInPost(req1);
    const body1 = await res1.json();
    expect(body1.alreadyCheckedIn).toBe(false);

    // Second check-in
    const req2 = new NextRequest("http://localhost/api/events/check-in?test=1", {
      method: "POST",
      body: JSON.stringify({ token: validToken }),
      headers: { "Content-Type": "application/json" },
    });
    const res2 = await checkInPost(req2);
    const body2 = await res2.json();
    expect(body2.ok).toBe(true);
    expect(body2.alreadyCheckedIn).toBe(true);
    expect(body2.meetingUrl).toBe("https://meet.google.com/vwg-hmsh-mrx");
  });
});
