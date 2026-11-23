import { describe, expect, it, vi, beforeEach } from "vitest";
import { adminServices } from "@/lib/admin/services";
import * as adminGate from "@/lib/admin/gate";

describe("admin member listings and startup revision unification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists all members from claims even when profiles table has join issues", async () => {
    vi.spyOn(adminGate, "getAdminContext").mockResolvedValue({
      mode: "live",
      permissions: new Set(["members.read", "directory.manage"]),
    } as any);

    // Mock createAdminClient
    const mockClaims = Array.from({ length: 71 }, (_, i) => ({
      id: `claim-${i + 1}`,
      user_id: `user-${i + 1}`,
      full_name: `Member ${i + 1}`,
      linked_account_email: `member${i + 1}@example.com`,
      whatsapp: `98765432${String(i).padStart(2, "0")}`,
      applicant_type: "new_applicant",
      reference: `CSC-2026-${String(i + 1).padStart(6, "0")}`,
      designation: "startup_founder",
      startup_affiliation: `Startup ${i + 1}`,
      declaration_accurate: true,
      status: "active",
      submitted_at: new Date(Date.now() - i * 100000).toISOString(),
    }));

    const mockMemberships = Array.from({ length: 71 }, (_, i) => ({
      id: `mem-${i + 1}`,
      user_id: `user-${i + 1}`,
      status: "active",
      member_number: `CSC-2026-${String(i + 1).padStart(6, "0")}`,
      issued_at: new Date(Date.now() - i * 100000).toISOString(),
      created_at: new Date(Date.now() - i * 100000).toISOString(),
    }));

    // Mock createAdminClient to return 71 claims and memberships
    const supabaseAdmin = await import("@/lib/supabase/admin");
    vi.spyOn(supabaseAdmin, "createAdminClient").mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "membership_claims") {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockClaims, error: null }),
            }),
          };
        }
        if (table === "memberships") {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockMemberships, error: null }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }),
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
        },
      },
    } as any);

    const res = await adminServices.listMembers();
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data).toHaveLength(71);
    expect(res.data[0].fullName).toBe("Member 1");
    expect(res.data[0].memberNumber).toBe("CSC-2026-000001");
    expect(res.data[0].status).toBe("active");
    expect(res.data[70].fullName).toBe("Member 71");
    expect(res.data[70].memberNumber).toBe("CSC-2026-000071");
  });
});
