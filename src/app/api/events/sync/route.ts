import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { invalidatePublicContent } from "@/lib/redis/cache";

export const instant = false;

const PROFESSIONAL_DESCRIPTION = `Welcome to the official registration for the **Coimbatore Startup Community (CSC) Joint Online Meeting**, proudly powered by Technical Partner **Logic Intelligence Technologies**.

* **Event Date:** **Sunday, November 22, 2026**
* **Session Timing:** **To Be Announced** *(Notified directly via email pass & CSC WhatsApp Community)*
* **Conference Mode:** **Online via Google Meet** *(Private verified room access)*
* **Registration Pass:** **₹10 per attendee** *(Automated instant bank UPI verification)*

**📋 Agenda & Highlights:**
* **Founder Networking & Collaborations:** Connect directly with Coimbatore’s founders, engineers, and ecosystem builders.
* **Ecosystem Roadmap & Open Floor:** Collaborative peer discussions on product scaling, architecture, and funding.
* **Instant Digital Event Pass:** Every confirmed attendee receives an **individual encrypted QR code** for automated check-in.

> **Important Notes:** Online check-in and Google Meet access open **3 hours before the meeting**. Complete your details below to secure your seat.`;

export async function GET() {
  try {
    const admin = createAdminClient();
    const dynamicDb = admin as unknown as SupabaseClient;

    // 1. Permanently remove duplicate events
    await admin.from("events").delete().eq("slug", "csc-first-online-google-meet");
    await admin.from("events").delete().neq("slug", "csc-joint-online-meeting").ilike("title", "%Joint Online Meeting%");

    // 2. Fetch canonical event
    const { data: event } = await admin
      .from("events")
      .select("id, slug, settings, price_per_attendee, price_minor, admission")
      .eq("slug", "csc-joint-online-meeting")
      .maybeSingle();

    if (event) {
      const currentSettings = (event.settings as Record<string, unknown> | null) ?? {};

      const dynamicDescription = `Welcome to the official registration for the **Coimbatore Startup Community (CSC) Joint Online Meeting**, proudly powered by Technical Partner **Logic Intelligence Technologies**.

* **Event Date:** **Sunday, November 22, 2026**
* **Session Timing:** **To Be Announced** *(Notified directly via email pass & CSC WhatsApp Community)*
* **Conference Mode:** **Online via Google Meet** *(Private verified room access)*
* **Registration:** **Free Admission · Open Community Registration** *(Instant encrypted digital QR pass)*

**📋 Agenda & Highlights:**
* **Founder Networking & Collaborations:** Connect directly with Coimbatore’s founders, engineers, and ecosystem builders.
* **Ecosystem Roadmap & Open Floor:** Collaborative peer discussions on product scaling, architecture, and funding.
* **Instant Digital Event Pass:** Every confirmed attendee receives an **individual encrypted QR code** for automated Google Meet check-in.

> **Important Notes:** Online check-in and Google Meet access open **3 hours before the meeting**. Complete your details below to secure your free seat.`;

      const cleanSettings = { ...currentSettings };
      delete cleanSettings.registrationMode;
      delete cleanSettings.registration_mode;
      delete cleanSettings.pricePerAttendee;
      delete cleanSettings.price_per_attendee;
      delete cleanSettings.price;
      delete cleanSettings.price_minor;

      const updatedSettings = {
        ...cleanSettings,
        title: "Coimbatore Startup Community (CSC) - Joint Online Meeting",
        coverImage: "/events/csc-joint-online-meeting-cover.webp",
        bannerImage: "/events/csc-joint-online-meeting-banner.webp",
        posterImage: "/events/csc-joint-online-meeting-poster.webp",
        timeNote: "To Be Announced (Will be notified via email and CSC WhatsApp Group)",
        timeTba: true,
        admission: "free",
        registrationMode: "rsvp",
        registration_mode: "rsvp",
        price: "0",
        pricePerAttendee: null,
        upiVpa: null,
        upiPayeeName: null,
        upiQrPath: null,
        onlineInfo: "https://meet.google.com/vwg-hmsh-mrx",
        googleMeetUrl: "https://meet.google.com/vwg-hmsh-mrx",
      };

      const { data: updateData, error: updateError } = await admin
        .from("events")
        .update({
          title: "Coimbatore Startup Community (CSC) - Joint Online Meeting",
          description: dynamicDescription,
          cover_image: "/events/csc-joint-online-meeting-cover.webp",
          admission: "free",
          registration_mode: "rsvp",
          location: "Online via Google Meet",
          venue: "Online (Google Meet)",
          price_per_attendee: null,
          price_minor: 0,
          settings: updatedSettings,
        })
        .eq("id", event.id)
        .select();

      if (updateError) {
        return NextResponse.json({ ok: false, error: updateError.message, eventId: event.id, syncVersion: "v3-clean" }, { status: 500 });
      }

      // Cancel any legacy pending orders
      await admin
        .from("event_payment_orders")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("event_id", event.id)
        .eq("status", "pending");

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
            title: "CSC Joint Online Meeting · Free Registration Open",
            message:
              "Join Coimbatore’s founders, builders, and ecosystem leaders for our official online meeting on Google Meet (Nov 22, 2026). Free community registration is now open with instant digital pass issuance.",
            button_label: "Register Free Now",
            status: "published",
            display_priority: 100,
          })
          .eq("id", existingNotice.id);
      } else {
        await dynamicDb.from("event_notices").insert({
          event_id: event.id,
          title: "CSC Joint Online Meeting · Free Registration Open",
          message:
            "Join Coimbatore’s founders, builders, and ecosystem leaders for our official online meeting on Google Meet (Nov 22, 2026). Free community registration is now open with instant digital pass issuance.",
          button_label: "Register Free Now",
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
        body: `## Coimbatore Startup Community · Official Community Announcement

Welcome to the official announcement for the **Coimbatore Startup Community (CSC) Joint Online Meeting**, proudly organized by **Coimbatore Startup Community** and powered by our Technical Partner, **Logic Intelligence Technologies**.

---

### 🌟 Executive Overview
This high-impact online gathering unites Coimbatore’s most ambitious **founders**, **tech innovators**, **software architects**, and **ecosystem leaders**. Whether you are bootstrap-building your MVP, scaling an early-stage venture, or seeking high-caliber co-founders, this forum is your launchpad.

---

### 🗓 Key Event Information
* **Official Date:** **Sunday, November 22, 2026**
* **Session Timing:** **To Be Announced** *(Detailed schedule updates will be dispatched directly to confirmed attendees via registered email and the official CSC WhatsApp Community)*
* **Conference Platform:** **Google Meet** *(Verified, passwordless room access)*
* **Event Pass Fee:** **₹10 per attendee** *(Instant automated bank verification & digital QR pass delivery)*

---

### 📋 Structured Agenda & Highlights
1. **Welcome Address & Ecosystem Roadmaps:** Discover upcoming initiatives, resource grants, and community opportunities within CSC Circle.
2. **Founder Introductions & Speed Networking:** Showcase what you are engineering, pitch your mission, and connect directly with fellow builders.
3. **Peer Advisory & Technical Problem-Solving:** Open collaborative discussions tackling product traction, infrastructure architecture, hiring, and early-stage capital.

---

### 🎯 Why You Should Register Now
* **Guaranteed Admission:** Capacity is strictly capped to foster meaningful peer engagement.
* **Instant Digital QR Pass:** Verified attendees receive an encrypted digital pass with one-click automatic check-in and instant Google Meet launch.
* **Direct Network Access:** Join the curated roster of Coimbatore's foremost entrepreneurs and builders.

> **Notice:** Registrations are now officially open. Complete your free community registration on CSC Circle to secure your seat.`,
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
    await invalidatePublicContent("events", ["list", "csc-joint-online-meeting"]);
    await invalidatePublicContent("updates", ["list", "csc-joint-online-meeting-announcement"]);

    return NextResponse.json({
      ok: true,
      message: "Duplicate event removed, description updated, and announcements published.",
      updatedEvent: event ? {
        id: event.id,
        admission: "free",
        price_per_attendee: 0,
      } : null,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
