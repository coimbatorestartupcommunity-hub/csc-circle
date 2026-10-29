import type { GoogleFormResponse } from "@/lib/import/google-form-csv";
import type { Database } from "@/lib/supabase/database.types";

type EventRegistrationRow = Database["public"]["Tables"]["event_registrations"]["Row"];

export type ExistingEventRegistration = Pick<EventRegistrationRow,
  "id" | "user_id" | "source_email" | "source" | "status" | "payment" | "created_at" | "source_parent_registration_id"
>;

export type ImportReviewStatus = "new" | "update" | "invalid";

const mailKey = (value: string) => value.trim().toLowerCase();

function registrationPriority(row: ExistingEventRegistration) {
  if (row.source === "google_form_import" && !row.source_parent_registration_id) return 0;
  if (["confirmed", "checked_in"].includes(row.status)) return 1;
  return 2;
}

/**
 * Resolve one reusable registration per email. Imported lead rows win, then an
 * already-issued pass, then the newest ordinary registration. Additional guest
 * pass rows are never treated as the Google Form lead.
 */
export function indexRegistrationsByEmail(
  registrations: ExistingEventRegistration[],
  userEmailById: Map<string, string>,
) {
  const indexed = new Map<string, ExistingEventRegistration>();
  const candidates = registrations
    .filter((row) => !row.source_parent_registration_id)
    .sort((left, right) => {
      const priority = registrationPriority(left) - registrationPriority(right);
      return priority || Date.parse(right.created_at) - Date.parse(left.created_at);
    });

  for (const row of candidates) {
    const emails = [row.source_email, userEmailById.get(row.user_id)]
      .filter((value): value is string => Boolean(value))
      .map(mailKey);
    for (const email of emails) if (email && !indexed.has(email)) indexed.set(email, row);
  }
  return indexed;
}

export function planGoogleFormImport(
  responses: GoogleFormResponse[],
  existingByEmail: Map<string, ExistingEventRegistration>,
  validate: (row: GoogleFormResponse) => string[],
) {
  const seen = new Set<string>();
  return responses.map((row, index) => {
    const key = mailKey(row.email);
    const errors = validate(row);
    const status: ImportReviewStatus = errors.length
      ? "invalid"
      : existingByEmail.has(key) || seen.has(key)
        ? "update"
        : "new";
    if (key) seen.add(key);
    return {
      rowNumber: index + 2,
      fullName: row.fullName,
      email: row.email,
      amountPaid: row.amountPaid,
      attendeeCount: row.attendeeCount,
      status,
      errors,
    };
  });
}
