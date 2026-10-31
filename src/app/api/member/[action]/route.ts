import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberContext } from "@/lib/services/member/context";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { rateLimit } from "@/lib/rate-limit";
import { claimSchema, profileSchema, onboardingStep1Schema, onboardingStep2FieldsSchema, onboardingStep3Schema, onboardingStep4Schema, onboardingStep5Schema } from "@/lib/validations/member";
import { reviewSchema } from "@/lib/validations/forms";
import type { Database } from "@/lib/supabase/database.types";
import { memberStartupSchema } from "@/lib/validations/member-startup";
import { isExactPendingStartupRevisionRetry } from "@/lib/member/startup-revision-retry";
import { classifyStartupSaveError, startupSaveErrorResponse } from "@/lib/member/startup-save-errors";
const consentSchema = onboardingStep5Schema;
const onboardingSchema = onboardingStep1Schema
  .merge(onboardingStep2FieldsSchema)
  .merge(onboardingStep3Schema)
  .merge(onboardingStep4Schema)
  .merge(onboardingStep5Schema)
  .extend({ startupDescription: z.string().max(600).optional() })
  .superRefine((value, ctx) => {
    if (value.designations.includes("other") && (value.designationOther?.trim().length ?? 0) < 2) {
      ctx.addIssue({ code: "custom", path: ["designationOther"], message: "Describe your category in 2 to 30 characters." });
    }
  });
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
      const { data, error } = await sb.from("membership_claims").insert({ user_id: user.id, full_name: v.fullName, linked_account_email: user.email!, applicant_type: v.applicantType, reference: v.reference || null, whatsapp: v.whatsapp.replace(/[ -]/g, ""), designation: v.designation as Database["public"]["Enums"]["member_designation"], designation_other: v.designation === "other" ? v.designationOther?.trim() || null : null, startup_affiliation: v.startupAffiliation || null, declaration_accurate: true }).select("id").single();
      if (!error) scheduleNotificationDelivery();
      return error ? authResponse({ error: "Claim was not saved. You may already have a pending claim." }, 409) : authResponse({ ok: true, id: data.id });
    }
    if (action === "review") {
      const parsed = reviewSchema.safeParse(body);
      if (!parsed.success) return authResponse({ error: "Check your review and consent." }, 422);
      const eventId = parsed.data.eventId;
      const collaborationId = parsed.data.collaborationId;
      if (eventId && collaborationId) return authResponse({ error: "Choose one activity to review." }, 422);
      if (collaborationId) {
        const { data: collaboration } = await sb.from("collaborations").select("id").eq("id", collaborationId).eq("status", "completed").eq("publication_status", "published").maybeSingle();
        if (!collaboration) return authResponse({ error: "This collaboration is not available for review." }, 403);
      }
      if (eventId) {
        const [{ data: event }, { data: attendance }] = await Promise.all([
          sb.from("events").select("ends_at,registration_state").eq("id", eventId).maybeSingle(),
          sb.from("event_registrations").select("id").eq("event_id", eventId).eq("user_id", user.id).eq("attendance", "checked_in").limit(1),
        ]);
        if (!event || (Date.parse(event.ends_at) > Date.now() && event.registration_state !== "completed") || !attendance?.length) return authResponse({ error: "Reviews are available to checked-in attendees after the event concludes." }, 403);
      }
      const kind = eventId ? "event" : collaborationId ? "collaboration" : "general";
      let lookup = sb.from("reviews").select("id,moderation").eq("user_id", user.id).eq("kind", kind);
      if (collaborationId) lookup = lookup.eq("collaboration_id", collaborationId);
      lookup = eventId ? lookup.eq("event_id", eventId) : lookup.is("event_id", null);
      const { data: existing, error: lookupError } = await lookup.maybeSingle();
      if (lookupError) return authResponse({ error: "Review status could not be checked. Please try again." }, 503);
      if (existing) return authResponse({ error: "You already submitted this review. View its status in My Reviews." }, 409);
      const { data, error } = await sb.from("reviews").insert({ user_id: user.id, rating: parsed.data.rating, review: parsed.data.review, kind, event_id: eventId ?? null, collaboration_id: collaborationId ?? null, moderation: "submitted", publication_consent: true, publication_consent_at: new Date().toISOString(), publication_consent_version: "csc-review-publication-v1" }).select("id,rating,review,moderation").single();
      if (!error) scheduleNotificationDelivery();
      if (error) return authResponse({ error: error.code === "23505" ? "You already have a community review. View its status in My Reviews." : "Review was not saved. Please try again." }, error.code === "23505" ? 409 : 503);
      return authResponse({ ok: true, id: data.id, review: { id: data.id, rating: data.rating, review: data.review, moderation: data.moderation } });
    }
    if (action === "profile") {
      const parsed = profileSchema.safeParse(body);
      if (!parsed.success) return authResponse({ error: "Check your profile details." }, 422);
      const v = parsed.data;

      const [{ data: currentProfile }, { count: startupCount }] = await Promise.all([
        sb.from("profiles").select("portrait_path, designations").eq("id", user.id).maybeSingle(),
        sb.from("directory_startups").select("id", { count: "exact", head: true }).eq("user_id", user.id).neq("status", "archived"),
      ]);

      const hasStartup = Boolean(v.startupName?.trim() || (startupCount ?? 0) > 0);
      const completionItems = [
        Boolean(v.fullName?.trim()),
        Boolean(v.displayName?.trim()),
        Boolean(v.whatsapp?.trim()),
        Boolean(v.city?.trim()),
        Boolean(currentProfile?.portrait_path),
        Boolean((currentProfile?.designations as string[])?.length),
        hasStartup,
      ];
      const completionPercent = Math.min(100, Math.round((completionItems.filter(Boolean).length / 7) * 100));

      const profileUpdate: Database["public"]["Tables"]["profiles"]["Update"] = {
        full_name: v.fullName,
        display_name: v.displayName,
        whatsapp: v.whatsapp.replace(/[ -]/g, ""),
        city: v.city,
        startup: { name: v.startupName, website: v.startupWebsite, description: v.startupDescription },
        profile_completion: completionPercent,
      };
      if (v.aboutMe !== undefined) profileUpdate.about_me = v.aboutMe;
      if (v.skills !== undefined) profileUpdate.skills = v.skills.split(",").map(x => x.trim()).filter(Boolean);
      const { data, error } = await sb.from("profiles").update(profileUpdate).eq("id", user.id).select("id").single();
      if (!error) revalidateTag("directory", { expire: 0 });
      if (!error) scheduleNotificationDelivery();
      if (error) {
        console.error("CSC_MEMBER_PROFILE_UPDATE_FAILED", { code: error.code ?? "unknown" });
        if (error.code === "PGRST116") return authResponse({ error: "Your member profile could not be found. Refresh the page and sign in again." }, 404);
        if (error.code === "42501") return authResponse({ error: "Profile editing is temporarily unavailable for this account. Contact CSC support if the problem continues." }, 403);
        return authResponse({ error: "Profile changes could not be saved. Check the highlighted fields and try again." }, 409);
      }
      return authResponse({ ok: true, id: data.id });
    }
    if (action === "preferences") {
      const parsed = consentSchema.safeParse(body);
      if (!parsed.success) return authResponse({ error: "Check your privacy preferences." }, 422);
      const { error } = await sb.rpc("update_member_profile_preferences", { p_consent: parsed.data });
      if (!error) revalidateTag("directory", { expire: 0 });
      if (!error) scheduleNotificationDelivery();
      return error ? authResponse({ error: "Preferences were not saved." }, 409) : authResponse({ ok: true, id: user.id });
    }
    if (action === "startup-save") {
      const parsed = memberStartupSchema.safeParse(body);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return authResponse({ code: "STARTUP_FIELD_INVALID", field: issue?.path.join(".") ?? "startup", error: issue?.message ?? "Check the highlighted startup information." }, 422);
      }
      const v = parsed.data;
      const { data: profile } = await sb.from("profiles").select("display_name,consent").eq("id", user.id).maybeSingle();
      const consent = profile?.consent;
      if (!profile?.display_name?.trim() || !consent || typeof consent !== "object" || Array.isArray(consent) || consent.directoryParticipation !== true || consent.displayNamePublicly !== true) {
        return authResponse({ error: "Complete your profile and enable directory participation and public-name consent before submitting." }, 422);
      }
      const admin = createAdminClient();
      const { data: existingStartup } = v.existingId ? await sb.from("directory_startups").select("id,status,directory_image_path,logo_url").eq("id", v.existingId).eq("user_id", user.id).maybeSingle() : { data: null };
      if (v.existingId && !existingStartup) return authResponse({ error: "That startup could not be found in your account." }, 404);
      const isPublishedEdit = existingStartup?.status === "published";
      if (isPublishedEdit && v.submitForApproval) {
        const { data: pendingRevision, error: pendingLookupError } = await sb.from("directory_startup_revisions")
          .select("id,status")
          .eq("startup_id", v.existingId!)
          .eq("status", "pending")
          .limit(1)
          .maybeSingle();
        if (pendingLookupError) return authResponse({ error: "The current startup review status could not be checked. Refresh and try again." }, 503);
        if (pendingRevision && pendingRevision.id !== v.revisionId) return authResponse(startupSaveErrorResponse("STARTUP_REVISION_PENDING"), 409);
      }
      const expectedDirectory = `${user.id}/${v.id}-directory-startup.webp`;
      const expectedRevisionDirectory = v.revisionId ? `${user.id}/${v.id}-revision-${v.revisionId}-directory-startup.webp` : "";
      const validDirectoryPath = v.directoryImagePath === expectedDirectory || (isPublishedEdit && (v.directoryImagePath === existingStartup?.directory_image_path || v.directoryImagePath === expectedRevisionDirectory));
      if (!validDirectoryPath) return authResponse({ error: "Upload or keep this startup's own 4:3 directory image." }, 422);
      const { error: imageError } = await admin.storage.from("member-portraits").download(v.directoryImagePath);
      if (imageError) {
        console.error("CSC_STARTUP_MEDIA_VERIFY_FAILED", { kind: "directory_image", storageCode: imageError.name, startupId: v.existingId ?? v.id, revisionId: v.revisionId });
        return authResponse({ code: "DIRECTORY_IMAGE_MISSING", error: "The saved directory image could not be found. Please upload your 4:3 image again." }, 422);
      }
      const expectedLogo = v.logoPath;
      const expectedLogoPath = `${user.id}/${v.id}-startup-logo.webp`;
      const expectedRevisionLogo = v.revisionId ? `${user.id}/${v.id}-revision-${v.revisionId}-startup-logo.webp` : "";
      const validLogoPath = !expectedLogo || expectedLogo === expectedLogoPath || (isPublishedEdit && (expectedLogo === existingStartup?.logo_url || expectedLogo === expectedRevisionLogo));
      if (!validLogoPath) return authResponse({ error: "The company logo could not be verified. Upload it again." }, 422);
      if (expectedLogo && !/^https?:\/\//i.test(expectedLogo)) {
        const { error: logoError } = await admin.storage.from("member-portraits").download(expectedLogo);
        if (logoError) {
          console.error("CSC_STARTUP_MEDIA_VERIFY_FAILED", { kind: "startup_logo", storageCode: logoError.name, startupId: v.existingId ?? v.id, revisionId: v.revisionId });
          return authResponse(startupSaveErrorResponse("STARTUP_LOGO_MISSING"), 422);
        }
      }
      const safeDetails = { ...v };
      for (const key of ["supportEmail", "additionalSupportEmail", "companyEmail", "companyMobile", "companyWhatsapp", "website", "id", "name", "slug", "industry", "description", "logoPath", "directoryImagePath", "existingId", "revisionId", "submitForApproval", "consent", "contactPerson", "founderCity", "founderMobile", "founderWhatsapp", "founderEmail"] as const) Reflect.deleteProperty(safeDetails, key);
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
      const pStartup = {
        id: v.id,
        ...(v.existingId ? { existingId: v.existingId } : {}),
        name: v.name,
        slug: v.slug,
        industry: v.industry,
        description: v.description,
        website: v.website,
        logoPath: expectedLogo || null,
        directoryImagePath: v.directoryImagePath,
        founderRole: v.founderRole,
        consent: true,
        details,
      };
      if (isPublishedEdit) {
        if (!v.revisionId) return authResponse({ error: "Reload the startup editor to create a secure revision." }, 409);
        const proposed = {
          name: v.name, slug: v.slug, industry: v.industry, description: v.description,
          website: v.publishWebsite ? v.website : null, logo_url: expectedLogo || null,
          directory_image_path: v.directoryImagePath, details,
          collaboration: v.collaboration,
          founder: { id: user.id, name: profile.display_name, role: v.founderRole },
        };
        const { data: revisionId, error } = await sb.rpc("submit_startup_revision", {
          p_startup_id: v.existingId!, p_revision_id: v.revisionId,
          p_proposed: proposed,
          p_private_details: privateDetails,
          p_submit: v.submitForApproval,
        });
        if (error || !revisionId) {
          const msg = error?.message ?? "Could not save startup changes.";
          const code = error?.code ?? "unknown";
          if (v.submitForApproval && (msg.includes("already submitted") || msg.includes("already pending"))) {
            // The first request may have committed while its response was lost
            // on a mobile network. Confirm the exact pending snapshot through
            // the owner-scoped RLS policy before acknowledging a safe retry.
            const { data: existingRevision, error: lookupError } = await sb.from("directory_startup_revisions")
              .select("status,proposed_data,proposed_private_details")
              .eq("id", v.revisionId).eq("startup_id", v.existingId!).maybeSingle();
            if (!lookupError && isExactPendingStartupRevisionRetry(existingRevision, proposed, privateDetails)) {
              scheduleNotificationDelivery();
              revalidateTag("directory", { expire: 0 });
              return authResponse({ ok: true, id: v.revisionId, status: "pending" });
            }
          }
          const category = classifyStartupSaveError(code, msg);
          console.error("CSC_STARTUP_REVISION_SAVE_FAILED", { sqlState: code, category, startupId: v.existingId, revisionId: v.revisionId });
          const status = category === "STARTUP_REVISION_PENDING" || category === "STARTUP_SLUG_CONFLICT" || category === "STARTUP_REVISION_STALE" || category === "STARTUP_NOT_EDITABLE" ? 409
            : category === "STARTUP_SAVE_FAILED" ? 503 : 422;
          return authResponse(startupSaveErrorResponse(category), status);
        }
        if (v.submitForApproval) scheduleNotificationDelivery();
        revalidateTag("directory", { expire: 0 });
        return authResponse({ ok: true, id: revisionId, status: v.submitForApproval ? "pending" : "draft" });
      }
      const { data: startupId, error } = await sb.rpc("save_member_startup", {
        p_startup: pStartup,
        p_private_details: privateDetails,
      });
      if (error || !startupId) {
        const msg = error?.message ?? "Could not save this startup.";
        if (msg.includes("startup_limit_reached")) return authResponse({ error: "You have reached the maximum of four startups." }, 409);
        if (msg.includes("published startups")) return authResponse({ error: "Refresh the startup editor to submit published changes for approval." }, 409);
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
      const { data, error } = await sb.from("profiles").update({ full_name: v.fullName, display_name: v.displayName, whatsapp: v.whatsapp.replace(/[ -]/g, ""), city: v.city, designations: v.designations as Database["public"]["Enums"]["member_designation"][], designation_other: v.designations.includes("other") ? v.designationOther?.trim() || null : null, goals: v.goals as Database["public"]["Enums"]["community_goal"][], startup: { name: v.startupName, website: v.startupWebsite, description: v.startupDescription ?? v.description }, profile_completion: 100 }).eq("id", user.id).select("id").single();
      const consentResult = !error ? await sb.rpc("update_member_profile_preferences", { p_consent: v }) : { error };
      if (!error && consentResult.error) return authResponse({ error: "Profile saved, but privacy preferences were not saved. Review Settings and try again." }, 409);
      if (!error) revalidateTag("directory", { expire: 0 });
      if (!error) scheduleNotificationDelivery();
      return error ? authResponse({ error: "Onboarding was not saved." }, 409) : consentResult.error ? authResponse({ error: "Profile saved, but privacy preferences were not saved. Review Settings and try again." }, 409) : authResponse({ ok: true, id: data.id });
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
