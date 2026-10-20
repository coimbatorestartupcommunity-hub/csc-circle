import { describe, expect, it } from "vitest";
import { attendanceCsv } from "@/lib/admin/attendance-csv";
import type { EventRegistration } from "@/types/member";

const row: EventRegistration = {
  id: "registration-1",
  eventId: "event-1",
  eventTitle: 'Founders "Connect"',
  startsAt: "2026-10-20T10:00:00Z",
  endsAt: "2026-10-20T12:00:00Z",
  venue: "Coimbatore, Hall A",
  location: "Coimbatore",
  reference: "CSC-REG-1",
  status: "confirmed",
  payment: "not_required",
  attendance: "not_attended",
  memberName: "=HYPERLINK(\"https://example.test\")",
  createdAt: "2026-10-19T10:00:00Z",
};

describe("attendance report CSV", () => {
  it("quotes cells and neutralizes spreadsheet formulas", () => {
    const csv = attendanceCsv([row]);
    expect(csv).toContain('"Founders ""Connect"""');
    expect(csv).toContain("\"'=HYPERLINK(\"\"https://example.test\"\")\"");
    expect(csv.split("\r\n")).toHaveLength(2);
  });

  it("returns a header for an empty report", () => {
    expect(attendanceCsv([])).toContain('"Registration reference"');
    expect(attendanceCsv([]).split("\r\n")).toHaveLength(1);
  });
});
