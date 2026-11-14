import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { invalidatePublicContent } from "@/lib/redis/cache";

export const instant = false;

const PROFESSIONAL_DESCRIPTION = `Welcome to the official registration page for the **Coimbatore Startup Community (CSC) Joint Online Meeting**, proudly powered by our Technical Partner, **Logic Intelligence Technologies**.

This exclusive online gathering brings together Coimbatore’s most driven **founders**, **tech entrepreneurs**, **innovators**, and **ecosystem builders**. Whether you are scaling an early-stage startup, building disruptive technology, or seeking the right co-founders and strategic collaborators, this meeting is your premier launchpad to connect, collaborate, and scale.

---

### 🗓 Event Information
* **Date:** **Sunday, November 22, 2026**
* **Time:** **To Be Announced** *(Will be communicated directly via email & CSC Community channels)*
* **Mode:** **Online via Google Meet** *(Private verified room access)*
* **Registration Fee:** **₹10 per attendee** *(Instant automated UPI verification)*

---

### 📋 Structured Agenda
1. **Welcome & Community Updates:** Discover the latest initiatives, platform features, incubation resources, and ecosystem roadmaps across CSC.
2. **Founder Introductions & Speed Networking:** Connect directly with fellow founders, showcase what you are building, and explore immediate synergies.
3. **Open Floor & Peer Advisory:** A high-impact collaborative session addressing real startup challenges, technical hurdles, fundraising discussions, and growth playbooks.

---

### 🚀 Why You Must Attend & Register
* **Guaranteed Virtual Seat:** Secure your spot in an intimate, founder-focused session.
* **Instant Digital Pass & Direct Access:** Receive an encrypted individual digital QR pass with single-tap check-in and automated Google Meet redirection.
* **Curated Attendee Roster:** Help us tailor discussion topics specifically to your startup stage and industry domain.

> **Important Instructions:** Please complete your registration and UPI payment verification below. Once verified, your personalized event pass and access credentials will be delivered instantly to your inbox.`;

export async function GET() {
  try {
    const admin = createAdminClient();
    const dynamicDb = admin as unknown as SupabaseClient;

    // 1. Permanently remove duplicate event
    await admin.from("events").delete().eq("slug", "csc-first-online-google-meet");

    // 2. Fetch canonical event
    const { data: event } = await admin
      .from("events")
      .select("id, slug, settings")
      .eq("slug", "csc-joint-online-meeting")
      .maybeSingle();

    if (event) {
      const currentSettings = (event.settings as Record<string, unknown> | null) ?? {};
      const updatedSettings = {
        ...currentSettings,
        coverImage: "/events/csc-joint-online-meeting-cover.webp",
        bannerImage: "/events/csc-joint-online-meeting-banner.webp",
        posterImage: "/events/csc-joint-online-meeting-poster.webp",
        timeNote: "To Be Announced (Will be notified via email and CSC WhatsApp Group)",
      };

      await admin
        .from("events")
        .update({
          description: PROFESSIONAL_DESCRIPTION,
          cover_image: "/events/csc-joint-online-meeting-cover.webp",
          settings: updatedSettings,
        })
        .eq("id", event.id);

      // 3. Create or update Event Notice for Featured Event Notices on /events
      const { data: existingNotice } = (await dynamicDb
        .from("event_notices")
        .select("id")
        .eq("event_id", event.id)
        .maybeSingle()) as { data: { id: string } | null };

      if (existingNotice) {
        await dynamicDb
          .from("event_notices")
          .update({
            title: "CSC Joint Online Meeting · Registrations Open",
            message:
              "Join Coimbatore’s founders, builders, and ecosystem leaders for our official online meeting on Google Meet (Nov 22, 2026). Session timing will be announced directly to confirmed attendees.",
            button_label: "Register Now",
            status: "published",
            display_priority: 100,
          })
          .eq("id", existingNotice.id);
      } else {
        await dynamicDb.from("event_notices").insert({
          event_id: event.id,
          title: "CSC Joint Online Meeting · Registrations Open",
          message:
            "Join Coimbatore’s founders, builders, and ecosystem leaders for our official online meeting on Google Meet (Nov 22, 2026). Session timing will be announced directly to confirmed attendees.",
          button_label: "Register Now",
          status: "published",
          display_priority: 100,
        });
      }

      // 4. Create or update Community Update for Updates & Highlights (/updates)
      const updateSlug = "csc-joint-online-meeting-announcement";
      const { data: existingUpdate } = (await dynamicDb
        .from("community_updates")
        .select("id")
        .eq("slug", updateSlug)
        .maybeSingle()) as { data: { id: string } | null };

      const updatePayload = {
        slug: updateSlug,
        title: "Announcing CSC Joint Online Meeting — Nov 22, 2026",
        category: "Announcements",
        summary:
          "Coimbatore Startup Community (CSC) is hosting its First Joint Online Meeting on Google Meet for founders, builders, and ecosystem leaders. Official timing to be announced.",
        body: `### Coimbatore Startup Community · Joint Online Meeting

We are thrilled to announce the official **Coimbatore Startup Community (CSC) Joint Online Meeting**, scheduled for **Sunday, November 22, 2026**, powered by our Technical Partner, **Logic Intelligence Technologies**.

This meeting unites Coimbatore's tech founders, startup leaders, operators, and creators in a dynamic virtual forum on **Google Meet**.

#### What to Expect:
* **Community Initiatives:** Insights into upcoming programs, mentorship access, and platform opportunities.
* **Founder Introductions & Networking:** Meet fellow entrepreneurs across the region and discover potential collaborations.
* **Open Discussion & Advisory:** Peer problem-solving on product development, scaling, hiring, and traction.

#### Event Details:
* **Date:** Sunday, November 22, 2026
* **Timing:** **To Be Announced** (Will be communicated to confirmed attendees)
* **Venue:** Online via Google Meet
* **Access Pass:** ₹10 per attendee with instant automated UPI verification & digital pass delivery

Secure your registration now on the official CSC Circle platform!`,
        featured: true,
        publication_consent: true,
        publication_status: "published",
        published_at: new Date().toISOString(),
        related_event_id: event.id,
      };

      if (existingUpdate) {
        await dynamicDb.from("community_updates").update(updatePayload).eq("id", existingUpdate.id);
      } else {
        await dynamicDb.from("community_updates").insert(updatePayload);
      }
    }

    // 5. Invalidate caches
    revalidatePath("/events");
    revalidatePath("/events/csc-joint-online-meeting");
    revalidatePath("/updates");
    revalidatePath("/");
    revalidateTag("events", { expire: 0 });
    revalidateTag("updates", { expire: 0 });
    await invalidatePublicContent("events", ["all", "csc-joint-online-meeting"]);
    await invalidatePublicContent("updates", ["list", "csc-joint-online-meeting-announcement"]);

    return NextResponse.json({
      ok: true,
      message: "Duplicate event removed, description updated, and announcements published.",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
