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

      const dynamicDescription = `Welcome to the official registration for the **Coimbatore Startup Community (CSC) First Joint Online Meeting**, proudly organized by **Coimbatore Startup Community** and powered by Technical Partner **Logic Intelligence Technologies**.

---

### 🌟 About This Event: Introductions, Showcases & Founder Networking
This inaugural online meeting brings together founders, tech entrepreneurs, builders, engineers, and creators from across Coimbatore and Tamil Nadu.

The primary focus of this first event is **Open Introductions & High-Impact Networking**:
* **Every Participant Introduces Themselves:** An open floor where all attendees introduce their personal background, professional journey, and core expertise.
* **Showcase Your Business & Startup:** Present what your venture builds, your product vision, target market, and current milestones.
* **Direct Networking & Contact Exchange:** Build direct connections with fellow founders, explore strategic partnerships, discover potential co-founders, and expand your contact network.
* **CSC Ecosystem Roadmap:** Learn about upcoming offline meetups, funding opportunities, technical mentorship programs, and resource grants.

---

### 🗓 Event Details & Schedule:
* **Event Date:** **Sunday, November 22, 2026**
* **Session Timing:** **3:00 PM – 5:00 PM IST** *(Sunday)*
* **Conference Mode:** **Online via Google Meet** *(Direct room access)*
* **Registration:** **100% Free Admission · Open Community Registration** *(Instant encrypted digital QR pass)*

---

### ⏱ Check-In & Google Meet Access:
* **Check-In Unlocks:** At **2:00 PM IST** (exactly 1 hour before the 3:00 PM session begins).
* **Instant Automatic Redirection:** Simply upload or scan your QR pass at the Check-In Portal to be automatically verified and connected to Google Meet.
* **Already Registered (19 Members) & New Attendees:** All confirmed registrations receive individual encrypted QR passes for automated entrance.`;

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
        timeNote: "3:00 PM – 5:00 PM IST (Google Meet)",
        timeTba: false,
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
          starts_at: "2026-11-22T15:00:00+05:30",
          ends_at: "2026-11-22T17:00:00+05:30",
          registration_deadline: "2026-11-22T17:00:00+05:30",
          registration_state: "open",
          status: "published",
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
      const noticePayload = {
        event_id: event.id,
        title: "CSC Joint Online Meeting · Introductions, Startup Showcases & Founder Networking",
        message:
          "Join Coimbatore’s founders, builders, and ecosystem leaders on Google Meet on Sunday, Nov 22, 2026 (3:00 PM – 5:00 PM IST). Every attendee will be introduced to showcase their business, background, and vision. Network directly, exchange contacts, and discover potential co-founders and collaborators. Check-in unlocks at 2:00 PM IST.",
        button_label: "Register Free Now",
        status: "published",
        visible_from: "2026-11-20T00:00:00+05:30",
        visible_until: "2026-11-22T23:59:59+05:30",
        display_priority: 100,
      };

      const { data: existingNotice } = (await dynamicDb
        .from("event_notices")
        .select("id")
        .eq("event_id", event.id)
        .maybeSingle()) as { data: { id: string } | null };

      if (existingNotice) {
        await dynamicDb
          .from("event_notices")
          .update(noticePayload)
          .eq("id", existingNotice.id);
      } else {
        await dynamicDb.from("event_notices").insert(noticePayload);
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
        title: "Announcing CSC Joint Online Meeting — Introductions, Startup Pitches & Founder Networking",
        category: "Announcements",
        summary:
          "Coimbatore Startup Community (CSC) is hosting its First Joint Online Meeting on Google Meet on Sunday, Nov 22, 2026, from 3:00 PM to 5:00 PM IST, featuring personal introductions, startup showcases, and direct founder networking.",
        body: `## Coimbatore Startup Community · Official Community Announcement

Welcome to the official announcement for the **Coimbatore Startup Community (CSC) First Joint Online Meeting**, proudly organized by **Coimbatore Startup Community** and powered by Technical Partner **Logic Intelligence Technologies**.

---

### 🌟 About This Event: Introductions, Showcases & Founder Networking
This inaugural online meeting is designed as an open, collaborative forum uniting Coimbatore’s founders, entrepreneurs, software architects, creators, and builders.

The primary focus of this session is **Open Introductions & High-Impact Networking**:
* **Every Participant Introduces Themselves:** An open floor where all attendees introduce their personal background, professional journey, and core expertise.
* **Showcase Your Business & Startup:** Present what your venture builds, your product vision, target market, and current milestones.
* **Direct Networking & Contact Exchange:** Build direct connections with fellow founders, explore strategic partnerships, discover potential co-founders, and expand your contact network.
* **CSC Ecosystem Roadmap:** Learn about upcoming offline meetups, funding opportunities, technical mentorship programs, and resource grants.

---

### 🗓 Key Event Schedule & Information
* **Official Date:** **Sunday, November 22, 2026**
* **Session Timing:** **3:00 PM – 5:00 PM IST** *(Sunday)*
* **Conference Platform:** **Google Meet** *(Direct room access)*
* **Event Pass:** **100% Free Community Admission** *(Instant digital QR pass)*

---

### 📲 Automated Check-In & Google Meet Access
* **Check-In Unlocks:** At **2:00 PM IST** (exactly 1 hour before the 3:00 PM meeting starts).
* **Automatic Google Meet Entry:** Attendees simply upload or scan their QR pass at [Check-in Portal](https://csc.logicintelligencetechnologies.in/events/google-meet/check-in). The portal verifies attendance in real time and automatically redirects directly to Google Meet within 2 seconds.
* **Existing & New Registrations:** All confirmed attendees (including the 19 registered members and all new registrations) receive an individual encrypted QR pass.

---

### 🔗 Official Links
* **Free Event Registration:** [https://csc.logicintelligencetechnologies.in/events/csc-joint-online-meeting](https://csc.logicintelligencetechnologies.in/events/csc-joint-online-meeting)
* **Check-In Portal:** [https://csc.logicintelligencetechnologies.in/events/google-meet/check-in](https://csc.logicintelligencetechnologies.in/events/google-meet/check-in)
* **Community Updates:** [https://csc.logicintelligencetechnologies.in/updates](https://csc.logicintelligencetechnologies.in/updates)

We look forward to an energetic and productive session connecting Coimbatore's vibrant startup builders!`,
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
