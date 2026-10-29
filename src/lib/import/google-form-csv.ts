export type GoogleFormResponse = {
  timestamp: string;
  email: string;
  fullName: string;
  whatsapp: string;
  organization: string;
  role: string;
  attendeeCount: number;
  additionalAttendeeNames: string;
  referralSource: string;
  amountPaid: number | null;
  transactionRef: string;
  paymentScreenshotUrl: string;
  raw: Record<string, string>;
};

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    if (quoted) {
      if (char === '"' && csv[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field.length === 0) quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && csv[i + 1] === "\n") i += 1;
      row.push(field); field = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else field += char;
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted field.");
  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

const normalizeHeader = (value: string) => value.toLocaleLowerCase("en").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
const headerHints: Record<keyof Omit<GoogleFormResponse, "raw">, string[]> = {
  timestamp: ["timestamp"], email: ["emailaddress", "email"], fullName: ["fullname", "name"],
  whatsapp: ["whatsappmobilenumber", "whatsapp", "mobilenumber"], organization: ["organizationcompanycollegename", "organization", "company", "college"],
  role: ["yourcurrentrole", "currentrole", "role"], attendeeCount: ["numberofattendeesincludingyourself", "numberofattendees", "attendees"],
  additionalAttendeeNames: ["fullnamesofadditionalattendees", "additionalattendees"], referralSource: ["howdidyouhearaboutthisevent", "howdidyouhear", "referral"],
  amountPaid: ["totalamountpaid", "amountpaid"], transactionRef: ["upitransactionidreferencenumber", "transactionid", "upireference"],
  paymentScreenshotUrl: ["uploadpaymentscreenshot", "paymentscreenshot"],
};

export function parseGoogleFormCsv(csv: string): GoogleFormResponse[] {
  const rows = parseCsvRows(csv);
  if (rows.length < 2) throw new Error("CSV needs a header and at least one response row.");
  const headers = rows[0].map(normalizeHeader);
  const indexes = Object.fromEntries(Object.entries(headerHints).map(([field, hints]) => [field, headers.findIndex((header) => hints.some((hint) => header.includes(hint)))])) as Record<keyof Omit<GoogleFormResponse, "raw">, number>;
  if (indexes.email < 0 || indexes.fullName < 0) throw new Error("CSV must include Email Address and Full Name columns.");
  return rows.slice(1).map((cells) => {
    const raw: Record<string, string> = {};
    rows[0].forEach((header, index) => { raw[header] = (cells[index] ?? "").trim(); });
    const get = (field: keyof Omit<GoogleFormResponse, "raw">) => indexes[field] < 0 ? "" : (cells[indexes[field]] ?? "").trim();
    const attendeeRaw = get("attendeeCount");
    const amountRaw = get("amountPaid").replace(/[₹,\s]/g, "");
    const amountParsed = Number(amountRaw);
    return {
      timestamp: get("timestamp"), email: get("email").toLowerCase(), fullName: get("fullName"), whatsapp: get("whatsapp"),
      organization: get("organization"), role: get("role"), attendeeCount: /^\d+$/.test(attendeeRaw) ? Number(attendeeRaw) : 0,
      additionalAttendeeNames: get("additionalAttendeeNames"), referralSource: get("referralSource"), amountPaid: amountRaw && Number.isFinite(amountParsed) ? amountParsed : null,
      transactionRef: get("transactionRef"), paymentScreenshotUrl: get("paymentScreenshotUrl"), raw,
    };
  });
}

export function validateGoogleFormResponse(row: GoogleFormResponse, options: { maxAttendees?: number; pricePerAttendee?: number } = {}) {
  const allowedRoles = ["Startup Founder / Co-Founder", "Entrepreneur / Business Owner", "Working Professional", "Student", "Freelancer / Creator", "Aspiring Entrepreneur", "Other"];
  const errors: string[] = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) || row.email.length > 254) errors.push("Valid email is required.");
  if (row.fullName.length < 2 || row.fullName.length > 100) errors.push("Full name is required.");
  if (row.attendeeCount < 1 || row.attendeeCount > (options.maxAttendees ?? 10)) errors.push(`Attendee count must be 1 to ${options.maxAttendees ?? 10}.`);
  const additionalNames = row.additionalAttendeeNames.split(/[\r\n;]/).map((name) => name.trim()).filter(Boolean);
  if (additionalNames.length !== Math.max(0, row.attendeeCount - 1)) errors.push("Additional attendee names must match the attendee count.");
  if (!row.whatsapp) errors.push("WhatsApp / mobile number is required.");
  if (!row.organization) errors.push("Organization is required.");
  if (!allowedRoles.includes(row.role)) errors.push("Role is missing or invalid.");
  if (row.amountPaid === null || row.amountPaid <= 0) errors.push("A valid total amount is required.");
  if (options.pricePerAttendee && row.amountPaid !== null && Math.abs(row.amountPaid - options.pricePerAttendee * row.attendeeCount) > 0.01) errors.push("Amount paid does not match the event price multiplied by attendee count.");
  if (!row.transactionRef) errors.push("UPI transaction reference is required.");
  try {
    const url = new URL(row.paymentScreenshotUrl);
    if (url.protocol !== "https:" || !["drive.google.com", "docs.google.com"].includes(url.hostname)) throw new Error("invalid");
  } catch { errors.push("A Google Drive payment screenshot URL is required."); }
  return errors;
}
