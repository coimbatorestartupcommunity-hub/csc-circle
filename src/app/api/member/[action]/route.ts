import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberContext } from "@/lib/services/member/context";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { rateLimit } from "@/lib/rate-limit";
import { claimSchema, profileSchema, onboardingStep1Schema, onboardingStep2Schema, onboardingStep3Schema, onboardingStep4Schema, onboardingStep5Schema } from "@/lib/validations/member";
import { reviewSchema } from "@/lib/validations/forms";
import type { Database } from "@/lib/supabase/database.types";
import { memberStartupSchema } from "@/lib/validations/member-startup";
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
      const { data: existing, error: lookupError } = await sb.from("reviews").select("id,moderation").eq("user_id", user.id).eq("kind", "general").is("event_id", null).maybeSingle();
      if (lookupError) return authResponse({ error: "Review status could not be checked. Please try again." }, 503);
      if (existing) return authResponse({ error: "You already have a community review. View its status in My Reviews." }, 409);
      const { data, error } = await sb.from("reviews").insert({ user_id: user.id, rating: parsed.data.rating, review: parsed.data.review, kind: "general", moderation: "submitted", publication_consent: true, publication_consent_at: new Date().toISOString(), publication_consent_version: "csc-review-publication-v1" }).select("id,rating,review,moderation").single();
      if (!error) scheduleNotificationDelivery();
      if (error) return authResponse({ error: error.code === "23505" ? "You already have a community review. View its status in My Reviews." : "Review was not saved. Please try again." }, error.code === "23505" ? 409 : 503);
      return authResponse({ ok: true, id: data.id, review: { id: data.id, rating: data.rating, review: data.review, moderation: data.moderation } });
    }
    if (action === "profile") {
      const parsed = profileSchema.safeParse(body);
      if (!parsed.success) return authResponse({ error: "Check your profile details." }, 422);
      const v = parsed.data;
      const { data, error } = await sb.from("profiles").update({ full_name: v.fullName, display_name: v.displayName, whatsapp: v.whatsapp.replace(/[ -]/g, ""), city: v.city, about_me: v.aboutMe ?? "", skills: (v.skills ?? "").split(",").map(x => x.trim()).filter(Boolean), startup: { name: v.startupName, website: v.startupWebsite, description: v.startupDescription } }).eq("id", user.id).select("id").single();
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
    if (action === "startup-save") {
      const parsed = memberStartupSchema.safeParse(body);
      if (!parsed.success) return authResponse({ error: "Check the required startup details, directory image, and publication consent." }, 422);
      const v = parsed.data;
      const { data: profile } = await sb.from("profiles").select("display_name,consent").eq("id", user.id).maybeSingle();
      const consent = profile?.consent;
      if (!profile?.display_name?.trim() || !consent || typeof consent !== "object" || Array.isArray(consent) || consent.directoryParticipation !== true || consent.displayNamePublicly !== true) {
        return authResponse({ error: "Complete your profile and enable directory participation and public-name consent before submitting." }, 422);
      }
      const admin = createAdminClient();
      const expectedDirectory = `${user.id}/${v.id}-directory-startup.webp`;
      if (v.directoryImagePath !== expectedDirectory) return authResponse({ error: "Upload a separate 4:3 directory image for this startup." }, 422);
      const { error: imageError } = await admin.storage.from("member-portraits").download(expectedDirectory);
      if (imageError) return authResponse({ error: "The 4:3 startup directory image could not be verified. Upload it again." }, 422);
      const expectedLogo = v.logoPath;
      if (expectedLogo && expectedLogo !== `${user.id}/${v.id}-startup-logo.webp`) {
        const { data: ownedExisting } = v.existingId ? await sb.from("directory_startups").select("logo_url").eq("id", v.existingId).eq("user_id", user.id).maybeSingle() : { data: null };
        const legacyPathAllowed = ownedExisting?.logo_url === expectedLogo && new RegExp(`^${user.id}/[0-9a-f-]{36}-startup-logo\\.webp$`, "i").test(expectedLogo);
        if (!legacyPathAllowed) return authResponse({ error: "The company logo could not be verified. Upload it again." }, 422);
      }
      if (expectedLogo) {
        const { error: logoError } = await admin.storage.from("member-portraits").download(expectedLogo);
        if (logoError) return authResponse({ error: "The company logo could not be verified. Upload it again." }, 422);
      }
      const safeDetails = { ...v };
      for (const key of ["supportEmail", "additionalSupportEmail", "companyEmail", "companyMobile", "companyWhatsapp", "website", "id", "name", "slug", "industry", "description", "logoPath", "directoryImagePath", "existingId", "consent", "contactPerson", "founderCity", "founderMobile", "founderWhatsapp", "founderEmail"] as const) Reflect.deleteProperty(safeDetails, key);
      const details = {
        ...safeDetails,
        ownerName: profile.display_name,
        visibility: {
          publishWebsite: v.publishWebsite,
          publishBusinessEmail: v.publishBusinessEmail,
          publishCompanyPhone: v.publishCompanyPhone,
          publishFounderContact: v.publishFounderContact,
        },
      };
      const privateDetails = { website: v.website, supportEmail: v.supportEmail, additionalSupportEmail: v.additionalSupportEmail, companyEmail: v.companyEmail, companyMobile: v.companyMobile, companyWhatsapp: v.companyWhatsapp, contactPerson: v.contactPerson, founderCity: v.founderCity, founderMobile: v.founderMobile, founderWhatsapp: v.founderWhatsapp, founderEmail: v.founderEmail };
      const { data: startupId, error } = await sb.rpc("save_member_startup", {
        p_startup: {
          id: v.id,
          ...(v.existingId ? { existingId: v.existingId } : {}),
          name: v.name,
          slug: v.slug,
          industry: v.industry,
          description: v.description,
          website: v.website,
          logoPath: expectedLogo || null,
          directoryImagePath: expectedDirectory,
          founderRole: v.founderRole,
          consent: true,
          details,
        },
        p_private_details: privateDetails,
      });
      if (error || !startupId) {
        const msg = error?.message ?? "Could not save this startup.";
        if (msg.includes("startup_limit_reached")) return authResponse({ error: "You have reached the maximum of four startups." }, 409);
        if (msg.includes("published startups")) return authResponse({ error: "Only draft or pending startup submissions can be edited here." }, 409);
        if (msg.includes("duplicate key")) return authResponse({ error: "That directory URL is already in use. Change the startup slug and try again." }, 409);
        return authResponse({ error: "The startup could not be saved for CSC review. Please check the details and retry." }, 409);
      }
      scheduleNotificationDelivery();
      revalidateTag("directory", { expire: 0 });
      return authResponse({ ok: true, id: startupId });
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
    return authResponse({ error: "Not found." }, 404);
  } catch { return authResponse({ error: "Could not save your information. Please try again." }, 503); }
}

export async function GET(_request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await context.params;
    if (action !== "review") return authResponse({ error: "Not found." }, 404);
    const ctx = await getMemberContext();
    if (ctx.mode !== "live") return authResponse({ error: "Sign in to continue." }, 401);
    const sb = await createClient();
    const { data, error } = await sb.from("reviews").select("id,rating,review,moderation").eq("user_id", ctx.user!.id).eq("kind", "general").is("event_id", null).maybeSingle();
    if (error) return authResponse({ error: "Review status could not be loaded." }, 503);
    return authResponse({ ok: true, review: data });
  } catch { return authResponse({ error: "Review status could not be loaded." }, 503); }
}
