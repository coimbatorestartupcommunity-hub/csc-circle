import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getMemberContext } from "@/lib/services/member/context";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { rateLimit } from "@/lib/rate-limit";
import { claimSchema, profileSchema, startupSubmissionSchema, onboardingStep1Schema, onboardingStep2Schema, onboardingStep3Schema, onboardingStep4Schema, onboardingStep5Schema } from "@/lib/validations/member";
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
      if (!error) scheduleNotificationDelivery();
      return error ? authResponse({ error: "Claim was not saved. You may already have a pending claim." }, 409) : authResponse({ ok: true, id: data.id });
    }
    if (action === "review") {
      const parsed = reviewSchema.safeParse(body);
      if (!parsed.success) return authResponse({ error: "Check your review and consent." }, 422);
      const { data, error } = await sb.from("reviews").insert({ user_id: user.id, rating: parsed.data.rating, review: parsed.data.review, kind: "general", moderation: "submitted" }).select("id").single();
      if (!error) scheduleNotificationDelivery();
      return error ? authResponse({ error: "Review was not saved. You may already have a review." }, 409) : authResponse({ ok: true, id: data.id });
    }
    if (action === "profile") {
      const parsed = profileSchema.safeParse(body);
      if (!parsed.success) return authResponse({ error: "Check your profile details." }, 422);
      const v = parsed.data;
      const { data, error } = await sb.from("profiles").update({ full_name: v.fullName, display_name: v.displayName, whatsapp: v.whatsapp.replace(/[ -]/g, ""), city: v.city, skills: (v.skills ?? "").split(",").map(x => x.trim()).filter(Boolean), startup: { name: v.startupName, website: v.startupWebsite, description: v.startupDescription } }).eq("id", user.id).select("id").single();
      if (!error) revalidateTag("directory", { expire: 0 });
      if (!error) scheduleNotificationDelivery();
      return error ? authResponse({ error: "Profile was not saved." }, 409) : authResponse({ ok: true, id: data.id });
    }
    if (action === "preferences") {
      const parsed = consentSchema.safeParse(body);
      if (!parsed.success) return authResponse({ error: "Check your privacy preferences." }, 422);
      const { data, error } = await sb.from("profiles").update({ consent: parsed.data }).eq("id", user.id).select("id").single();
      if (!error) revalidateTag("directory", { expire: 0 });
      if (!error) scheduleNotificationDelivery();
      return error ? authResponse({ error: "Preferences were not saved." }, 409) : authResponse({ ok: true, id: data.id });
    }
    if (action === "onboarding") {
      const parsed = onboardingSchema.safeParse(body);
      if (!parsed.success) return authResponse({ error: "Complete all onboarding fields and required consent." }, 422);
      const v = parsed.data;
      const { membershipTerms, operationalEmail, marketingEmail, directoryParticipation, displayNamePublicly, displayPhotoPublicly } = v;
      const { data, error } = await sb.from("profiles").update({ full_name: v.fullName, display_name: v.displayName, whatsapp: v.whatsapp.replace(/[ -]/g, ""), city: v.city, designations: v.designations as Database["public"]["Enums"]["member_designation"][], goals: v.goals as Database["public"]["Enums"]["community_goal"][], startup: { name: v.startupName, website: v.startupWebsite, description: v.startupDescription ?? v.description }, consent: { membershipTerms, operationalEmail, marketingEmail, directoryParticipation, displayNamePublicly, displayPhotoPublicly }, profile_completion: 100 }).eq("id", user.id).select("id").single();
      if (!error) revalidateTag("directory", { expire: 0 });
      if (!error) scheduleNotificationDelivery();
      return error ? authResponse({ error: "Onboarding was not saved." }, 409) : authResponse({ ok: true, id: data.id });
    }
    if (action === "startup") {
      const parsed = startupSubmissionSchema.safeParse(body);
      if (!parsed.success) return authResponse({ error: "Check your startup details and consent." }, 422);
      const v = parsed.data;
      const { data: profile } = await sb.from("profiles").select("display_name,consent,portrait_path,directory_photo_path").eq("id", user.id).single();
      if (!profile?.portrait_path || !profile.directory_photo_path) return authResponse({ error: "Save both your 4:5 member portrait and 4:3 directory photo before submitting a startup.", action: "/member/profile#profile-portrait" }, 422);
      const consent = profile.consent;
      if (!consent || typeof consent !== "object" || Array.isArray(consent) || consent.directoryParticipation !== true || consent.displayNamePublicly !== true || consent.displayPhotoPublicly !== true) return authResponse({ error: "Enable directory participation and consent to showing your name and photo in your privacy settings first." }, 422);
      if (!profile.display_name?.trim()) return authResponse({ error: "Add a public display name to your profile before submitting." }, 422);
      const { data, error } = await sb.from("directory_startups").insert({ user_id: user.id, name: v.name, slug: v.slug, industry: v.industry, description: v.description, website: v.website || null, founder: { name: profile.display_name }, publication_consent: true, publication_consent_at: new Date().toISOString(), status: "pending" }).select("id").single();
      if (!error) scheduleNotificationDelivery();
      return error ? authResponse({ error: "Startup was not saved. The slug may already be in use." }, 409) : authResponse({ ok: true, id: data.id });
    }
    return authResponse({ error: "Not found." }, 404);
  } catch { return authResponse({ error: "Could not save your information. Please try again." }, 503); }
}
