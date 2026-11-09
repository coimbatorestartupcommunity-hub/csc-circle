"use server";

import { headers } from "next/headers";
import { clientIp, distributedRateLimit } from "@/lib/rate-limit";
import { memberSurveySubmissionSchema } from "@/lib/community-data/schema";
import { insertMemberSurveySubmission } from "@/lib/community-data/service";
import { createSubmissionClient } from "@/lib/supabase/submissions";

export type MemberSurveyActionResult =
  | { ok: true }
  | {
      ok: false;
      code: "VALIDATION" | "BOT_CHECK" | "RATE_LIMIT" | "UNAVAILABLE" | "SAVE_FAILED";
      message: string;
      fieldErrors?: Record<string, string[]>;
      retryAfter?: number;
    };

export async function submitMemberSurvey(input: unknown): Promise<MemberSurveyActionResult> {
  const parsed = memberSurveySubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Please check your details and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const value = parsed.data;
  const elapsed = Date.now() - value.form_started_at;
  if (value.website || elapsed < 1_500 || elapsed > 24 * 60 * 60 * 1000) {
    return {
      ok: false,
      code: "BOT_CHECK",
      message: "We couldn't verify this submission. Please refresh the page and try again.",
    };
  }

  const client = createSubmissionClient();
  if (!client) {
    return {
      ok: false,
      code: "UNAVAILABLE",
      message: "Submissions are temporarily unavailable. Please try again shortly.",
    };
  }

  const incomingHeaders = await headers();
  const request = new Request("https://internal.csc.invalid", { headers: new Headers(incomingHeaders) });
  const ip = clientIp(request);
  const fallbackFingerprint = incomingHeaders.get("user-agent")?.slice(0, 160) || "unknown-client";
  const rateKey = ip === "unknown" ? fallbackFingerprint : ip;
  const [ipLimit, emailLimit] = await Promise.all([
    distributedRateLimit(client, "member-survey-ip", rateKey, 5, 15 * 60_000),
    distributedRateLimit(client, "member-survey-email", value.email, 3, 60 * 60_000),
  ]);

  if (!ipLimit.allowed || !emailLimit.allowed) {
    const retryAfter = Math.max(ipLimit.retryAfter, emailLimit.retryAfter, 1);
    return {
      ok: false,
      code: "RATE_LIMIT",
      message: "Too many submissions were received. Please wait and try again.",
      retryAfter,
    };
  }

  try {
    const result = await insertMemberSurveySubmission(value);
    if (!result.ok) {
      return {
        ok: false,
        code: "SAVE_FAILED",
        message: "Please check your details and try again.",
      };
    }
    // A repeated idempotency token represents the same browser submission and
    // intentionally receives the same safe success response.
    return { ok: true };
  } catch {
    console.error("CSC_MEMBER_SURVEY_SUBMISSION_FAILED");
    return {
      ok: false,
      code: "UNAVAILABLE",
      message: "Submissions are temporarily unavailable. Please try again shortly.",
    };
  }
}
