import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getMemberContext } from "@/lib/services/member/context";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { rateLimit } from "@/lib/rate-limit";
import { claimSchema, profileSchema, onboardingStep1Schema, onboardingStep2Schema, onboardingStep3Schema, onboardingStep4Schema, onboardingStep5Schema } from "@/lib/validations/member";
import { reviewSchema } from "@/lib/validations/forms";
import type { Database } from "@/lib/supabase/database.types";
const consentSchema = onboardingStep5Schema;
const onboardingSchema = onboardingStep1Schema.merge(onboardingStep2Schema).merge(onboardingStep3Schema).merge(onboardingStep4Schema).merge(onboardingStep5Schema).extend({ startupDescription: z.string().max(600).optional() });
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    const ctx = await getMemberContext();
    if (ctx.mode !== "live") return authResponse({ error: "Sign in to continue." }, 401);
    const { action } = await context.params;
    if (!rateLimit(`member:${action}:${ctx.user!.id}`, 10, 60_000).allowed) return authResponse({ error: "Too many submissions. Try again later." }, 429);
    const body = await readAuthBody(request);
    if (!body) return authResponse({ error: "Invalid request." }, 400);
    const sb = await createClient();
    const user = ctx.user!;
    if (action === "claim") {
      const parsed = claimSchema.safeParse(body);
      if (!parsed.success) return authResponse({ error: "Check all claim fields and your declaration." }, 422);
      const v = parsed.data;
      const { data, error } = await sb.from("membership_claims").insert({ user_id: user.id, full_name: v.fullName, linked_account_email: user.email!, applicant_type: v.applicantType, reference: v.reference || null, whatsapp: v.whatsapp.replace(/[ -]/g, ""), designation: v.designation as Database["public"]["Enums"]["member_designation"], startup_affiliation: v.startupAffiliation || null, declaration_accurate: true }).select("id").single();
      return error ? authResponse({ error: "Claim was not saved. You may already have a pending claim." }, 409) : authResponse({ ok: true, id: data.id });
    }
    if (action === "review") {
      const parsed = reviewSchema.safeParse(body);
      if (!parsed.success) return authResponse({ error: "Check your review and consent." }, 422);
      const { data, error } = await sb.from("reviews").insert({ user_id: user.id, rating: parsed.data.rating, review: parsed.data.review, kind: "general", moderation: "submitted" }).select("id").single();
      return error ? authResponse({ error: "Review was not saved. You may already have a review." }, 409) : authResponse({ ok: true, id: data.id });
    }
    if (action === "profile") {
      const parsed = profileSchema.safeParse(body);
      if (!parsed.success) return authResponse({ error: "Check your profile details." }, 422);
      const v = parsed.data;
      const { data, error } = await sb.from("profiles").update({ full_name: v.fullName, display_name: v.displayName, whatsapp: v.whatsapp.replace(/[ -]/g, ""), city: v.city, skills: (v.skills ?? "").split(",").map(x => x.trim()).filter(Boolean), startup: { name: v.startupName, website: v.startupWebsite, description: v.startupDescription } }).eq("id", user.id).select("id").single();
      return error ? authResponse({ error: "Profile was not saved." }, 409) : authResponse({ ok: true, id: data.id });
    }
    if (action === "preferences") {
      const parsed = consentSchema.safeParse(body);
      if (!parsed.success) return authResponse({ error: "Check your privacy preferences." }, 422);
      const { data, error } = await sb.from("profiles").update({ consent: parsed.data }).eq("id", user.id).select("id").single();
      return error ? authResponse({ error: "Preferences were not saved." }, 409) : authResponse({ ok: true, id: data.id });
    }
    if (action === "onboarding") {
      const parsed = onboardingSchema.safeParse(body);
      if (!parsed.success) return authResponse({ error: "Complete all onboarding fields and required consent." }, 422);
      const v = parsed.data;
      const { membershipTerms, operationalEmail, marketingEmail, directoryParticipation, displayNamePublicly, displayPhotoPublicly } = v;
      const { data, error } = await sb.from("profiles").update({ full_name: v.fullName, display_name: v.displayName, email: user.email, whatsapp: v.whatsapp.replace(/[ -]/g, ""), city: v.city, designations: v.designations as Database["public"]["Enums"]["member_designation"][], goals: v.goals as Database["public"]["Enums"]["community_goal"][], startup: { name: v.startupName, website: v.startupWebsite, description: v.startupDescription ?? v.description }, consent: { membershipTerms, operationalEmail, marketingEmail, directoryParticipation, displayNamePublicly, displayPhotoPublicly }, profile_completion: 100 }).eq("id", user.id).select("id").single();
      return error ? authResponse({ error: "Onboarding was not saved." }, 409) : authResponse({ ok: true, id: data.id });
    }
    if (action === "startup") {
      const url = z.string().url().refine(v => /^https?:\/\//.test(v)).or(z.literal(""));
      const parsed = z.object({ name: z.string().trim().min(2).max(120), slug: z.string().regex(/^[a-z0-9-]{3,120}$/), industry: z.enum(["ai", "saas", "d2c", "healthtech", "fintech", "marketing", "education", "other"]), description: z.string().trim().min(20).max(600), website: url, consent: z.literal(true) }).safeParse(body);
      if (!parsed.success) return authResponse({ error: "Check your startup details and consent." }, 422);
      const v = parsed.data;
      const { data: profile } = await sb.from("profiles").select("display_name,consent").eq("id", user.id).single();
      if (!profile || !profile.consent || typeof profile.consent !== "object" || Array.isArray(profile.consent) || profile.consent.directoryParticipation !== true) return authResponse({ error: "Enable directory participation in your privacy preferences first." }, 422);
      const { data, error } = await sb.from("directory_startups").insert({ user_id: user.id, name: v.name, slug: v.slug, industry: v.industry, description: v.description, website: v.website || null, founder: { name: profile.display_name ?? "CSC Founder" }, status: "pending" }).select("id").single();
      return error ? authResponse({ error: "Startup was not saved. The slug may already be in use." }, 409) : authResponse({ ok: true, id: data.id });
    }
    return authResponse({ error: "Not found." }, 404);
  } catch { return authResponse({ error: "Could not save your information. Please try again." }, 503); }
}
