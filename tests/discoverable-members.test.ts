import { describe, it, expect } from "vitest";
import { fetchDiscoverableMembers, fetchDiscoverableMember } from "@/lib/services/member/discoverable";

describe("Discoverable Members Directory Service", () => {
  it("fetches active discoverable members list with valid fields", async () => {
    const members = await fetchDiscoverableMembers({ limit: 10, offset: 0 });
    expect(Array.isArray(members)).toBe(true);
    expect(members.length).toBeGreaterThan(0);

    const first = members[0];
    expect(first).toHaveProperty("member_id");
    expect(first).toHaveProperty("display_name");
    expect(first).toHaveProperty("has_photo");
    expect(typeof first.display_name).toBe("string");
    expect(first.display_name.length).toBeGreaterThan(0);
    expect(first.membership_status).toBe("active");
  });

  it("fetches a single discoverable member by ID", async () => {
    const members = await fetchDiscoverableMembers({ limit: 1, offset: 0 });
    expect(members.length).toBeGreaterThan(0);

    const targetId = members[0].member_id;
    const member = await fetchDiscoverableMember(targetId);
    expect(member).not.toBeNull();
    expect(member?.member_id).toBe(targetId);
    expect(member?.display_name).toBe(members[0].display_name);
  });
});
