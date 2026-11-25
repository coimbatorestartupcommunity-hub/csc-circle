import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { normalizePhoneNumber, maskPhoneNumber } from "@/lib/phone/normalize";
import { contactFormSchema } from "@/lib/validations/contact.schema";
import { createSubmissionClient } from "@/lib/supabase/submissions";
import { dispatchTeamWhatsAppAlert } from "@/lib/services/team-alerts";

interface SubmitContactInquiryResult {
  contact_id: string;
  outbox_id: string | null;
  whatsapp_status: "queued" | "skipped_no_consent" | "pending" | "processing";
  existing?: boolean;
}

/**
 * Public Contact API Endpoint.
 *
 * Architecture:
 * 1. IP-backed rate limiting (5 req / min per IP)
 * 2. Zod validation & honeypot bot trap detection
 * 3. Strict E.164 phone normalization via libphonenumber-js
 * 4. Atomic PostgreSQL transactional outbox insertion via `submit_contact_inquiry` RPC
 * 5. Returns HTTP 202 Accepted asynchronously without holding request open for gateway delivery
 */
export async function POST(req: Request) {
  // 1. IP Rate Limiting
  const ip = clientIp(req);
  const ipLimit = rateLimit(`contact:ip:${ip}`, 5, 60_000);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(ipLimit.retryAfter || 60),
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }

  // 2. Parse JSON Payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON input" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  // 3. Schema Validation
  const parsed = contactFormSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message || "Invalid input";
    return NextResponse.json(
      { success: false, error: firstIssue },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { name, phone: rawPhone, inquiry, whatsappConsent, _hp } = parsed.data;

  // Bot honeypot defense: silently accept without persisting
  if (_hp && _hp.trim().length > 0) {
    return NextResponse.json(
      {
        success: true,
        message: "Your inquiry has been received.",
        contactId: "bot-discarded",
        whatsappStatus: "skipped_no_consent",
      },
      { status: 202 }
    );
  }

  // 4. Phone Normalization
  const phoneResult = normalizePhoneNumber(rawPhone, "IN");
  if (!phoneResult.valid || !phoneResult.e164 || !phoneResult.chatId) {
    return NextResponse.json(
      { success: false, error: "Invalid phone number. Please enter a valid mobile number with country code." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Secondary Rate Limiting by normalized phone number (3 submissions per 10 minutes)
  const phoneLimit = rateLimit(`contact:phone:${phoneResult.e164}`, 3, 600_000);
  if (!phoneLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests for this phone number. Please wait a few minutes." },
      {
        status: 429,
        headers: {
          "Retry-After": String(phoneLimit.retryAfter || 600),
          "Cache-Control": "no-store",
        },
      }
    );
  }

  // 5. Idempotency Key Handling
  const idempotencyKey =
    req.headers.get("Idempotency-Key")?.trim() ||
    req.headers.get("idempotency-key")?.trim() ||
    null;

  // 6. Connect to Supabase via server-side elevated client
  const supabase = createSubmissionClient();
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: "Submission service temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Message template payload stored with outbox for worker formatting
  const messagePayload = {
    name,
    phone: phoneResult.e164,
    chatId: phoneResult.chatId,
    inquiry: inquiry || null,
    submittedAt: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.rpc("submit_contact_inquiry", {
      p_name: name,
      p_phone: phoneResult.e164,
      p_phone_chat_id: phoneResult.chatId,
      p_inquiry: inquiry || null,
      p_whatsapp_consent: Boolean(whatsappConsent),
      p_consent_notice_version: "1.0",
      p_source: "website_contact_form",
      p_idempotency_key: idempotencyKey,
      p_message_payload: messagePayload,
    });

    if (error || !data) {
      console.error("[POST /api/contact] Database error:", {
        code: error?.code,
        message: error?.message,
        phone: maskPhoneNumber(phoneResult.e164),
      });
      return NextResponse.json(
        { success: false, error: "Submission service temporarily unavailable." },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    const outcome = data as unknown as SubmitContactInquiryResult;

    // Dispatch real-time alert to Leadership Team WhatsApp Group & Admin phone
    void dispatchTeamWhatsAppAlert({
      type: "contact_inquiry",
      title: "New Website Contact Inquiry",
      fields: {
        "Name": name,
        "Phone": phoneResult.e164,
        "Inquiry": inquiry ? inquiry.slice(0, 200) : "General Inquiry",
        "WhatsApp Consent": whatsappConsent ? "Yes" : "No",
      },
      actionUrl: "https://csc.logicintelligencetechnologies.in/admin",
    }).catch((alertErr) => console.warn("[POST /api/contact] Team alert note:", alertErr));

    return NextResponse.json(
      {
        success: true,
        message: "Your inquiry has been received.",
        contactId: outcome.contact_id,
        whatsappStatus: outcome.whatsapp_status,
      },
      {
        status: 202,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch (err) {
    console.error("[POST /api/contact] Unexpected submission failure:", {
      error: err instanceof Error ? err.message : String(err),
      phone: maskPhoneNumber(phoneResult.e164),
    });
    return NextResponse.json(
      { success: false, error: "Submission service temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
