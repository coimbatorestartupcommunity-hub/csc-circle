import type { EventRegistration } from "@/types/member";

function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  // Spreadsheet applications may evaluate a value beginning with these
  // characters as a formula. Prefix those values before CSV quoting.
  if (/^[\s\u0000-\u001f]*[=+@\-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function attendanceCsv(rows: EventRegistration[]): string {
  const header = ["Event", "Event starts", "Venue", "Registration reference", "Attendee", "Registration status", "Payment status", "Attendance", "Registered at"];
  const records = rows.map((row) => [
    row.eventTitle,
    row.startsAt,
    row.venue ?? row.location,
    row.reference,
    row.memberName,
    row.status,
    row.payment,
    row.attendance,
    row.createdAt,
  ]);
  return [header, ...records].map((record) => record.map(csvCell).join(",")).join("\r\n");
}
