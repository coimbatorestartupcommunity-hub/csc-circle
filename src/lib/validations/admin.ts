import { z } from "zod";

const urlOrEmpty = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^https?:\/\/.+/.test(v), "Enter a valid URL.");

const eventCoverImage = z.string().trim().optional().refine(
  (value) => !value || /^https?:\/\/.+/.test(value) || /^event-covers\/[0-9a-f-]{36}\.webp$/i.test(value) || /^\/events\/[a-z0-9-]+\.(jpg|png|webp)$/i.test(value),
  "Choose a valid URL or upload an event cover image.",
);
const eventQrImage = z.string().trim().optional().refine(
  (value) => !value || /^event-upi-qr\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(value),
  "Upload a valid UPI QR image.",
);

export const eventEditorSchema = z.object({
  // A. Basic
  title: z.string().trim().min(3, "Enter an event title.").max(140),
  slug: z
    .string()
    .trim()
    .min(3, "Enter a slug.")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only."),
  summary: z.string().trim().max(200).optional(),
  description: z.string().trim().min(10, "Add a description.").max(4000),
  category: z.enum([
    "meetup",
    "pitch-session",
    "workshop",
    "networking",
    "consultation",
  ]),
  organizer: z.string().trim().max(120).optional(),
  // B. Media
  coverImage: eventCoverImage,
  imageAlt: z.string().trim().max(160).optional(),
  // C. Scheduling (Asia/Kolkata)
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a start time."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose an end time."),
  registrationDeadline: z.string().optional(),
  // D. Location
  format: z.enum(["offline", "online", "hybrid"]),
  venueName: z.string().trim().max(160).optional(),
  venueAddress: z.string().trim().max(300).optional(),
  mapsUrl: urlOrEmpty,
  onlineInfo: z.string().trim().max(300).optional(),
  // F. Registration
  capacity: z.string().trim().optional(),
  approvalMode: z.enum(["automatic", "manual"]),
  allowWaitlist: z.boolean(),
  cancellationDeadline: z.string().optional(),
  specialInstructions: z.string().trim().max(500).optional(),
  // G. Payments
  admission: z.enum(["free", "paid"]),
  price: z.string().trim().optional(),
  currency: z.string().trim().min(1).max(8),
  paymentInstructions: z.string().trim().max(500).optional(),
  registrationMode: z.enum(["rsvp", "paid_upi"]),
  pricePerAttendee: z.string().trim().optional(),
  maxAttendeesPerRegistration: z.coerce.number().int().min(1).max(10),
  upiVpa: z.string().trim().max(120).optional(),
  upiPayeeName: z.string().trim().max(120).optional(),
  upiQrPath: eventQrImage,
  paymentNote: z.string().trim().max(500).optional(),
  // H. Publication
  status: z.enum(["draft", "published"]),
}).superRefine((event, ctx) => {
  if (event.registrationMode === "paid_upi") {
    const price = Number(event.pricePerAttendee);
    if (event.admission !== "paid" || !Number.isFinite(price) || price <= 0) ctx.addIssue({ code: "custom", path: ["pricePerAttendee"], message: "Paid UPI registration requires a positive price per attendee." });
    if (event.status === "published" && (!event.upiVpa?.trim() || !event.upiPayeeName?.trim() || !event.upiQrPath?.trim())) ctx.addIssue({ code: "custom", path: ["upiVpa"], message: "Set the UPI VPA, payee name, and upload its QR image before publishing." });
  }
});

export type EventEditorValues = z.input<typeof eventEditorSchema>;
export type ParsedEventEditorValues = z.output<typeof eventEditorSchema>;

export const eventEditorDefaults: Partial<EventEditorValues> = {
  category: "meetup",
  format: "offline",
  approvalMode: "automatic",
  allowWaitlist: true,
  admission: "free",
  currency: "INR",
  registrationMode: "rsvp",
  maxAttendeesPerRegistration: 10,
  status: "draft",
};
