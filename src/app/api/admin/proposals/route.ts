import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { getAdminContext, can } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const proposalActionSchema = z.object({
  kind: z.enum(["collaboration", "event", "opportunity", "resource"]),
  id: z.string().min(1),
  action: z.enum(["approve", "reject", "delete"]),
});

export async function GET() {
  const ctx = await getAdminContext();
  if (ctx.mode === "closed") {
    return NextResponse.json({ error: "Admin system closed." }, { status: 403 });
  }
  if (ctx.mode === "forbidden" || !can(ctx, "content.manage")) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
  }

  try {
    const adminSb = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    // 1. Collaboration Proposals (status = 'proposal' or publication_status = 'draft')
    const { data: collabData } = await adminSb
      .from("collaborations")
      .select("id, slug, title, tagline, summary, story, category, status, publication_status, highlights, created_at")
      .or("status.eq.proposal,publication_status.eq.draft")
      .order("created_at", { ascending: false });

    // 2. Event Proposals (status = 'draft' or title ilike '[Proposal]%')
    const { data: eventData } = await adminSb
      .from("events")
      .select("id, slug, title, summary, description, category, format, venue, capacity, admission, status, starts_at, created_at")
      .or("status.eq.draft,title.ilike.%[Proposal]%")
      .order("created_at", { ascending: false });

    // 3. Opportunity Intake (publication_status = 'draft' or source in ('community_submission','member_submission'))
    const { data: oppData } = await adminSb
      .from("opportunities")
      .select("id, slug, title, category, organization, location, participation_mode, contact, deadline, summary, description, source, publication_status, created_at")
      .or("publication_status.eq.draft,source.in.(community_submission,member_submission)")
      .order("created_at", { ascending: false });

    // 4. Resource Submissions (publication_status = 'draft' or title ilike '[Proposal]%')
    const { data: resData } = await adminSb
      .from("resources")
      .select("id, slug, title, category, resource_type, summary, description, external_url, author, source_name, publication_status, created_at")
      .or("publication_status.eq.draft,title.ilike.%[Proposal]%")
      .order("created_at", { ascending: false });

    return NextResponse.json({
      ok: true,
      collaborations: collabData || [],
      events: eventData || [],
      opportunities: oppData || [],
      resources: resData || [],
    });
  } catch (err) {
    console.error("Error fetching proposals:", err);
    return NextResponse.json({ error: "Failed to load proposals." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = await getAdminContext();
  if (ctx.mode === "closed") {
    return NextResponse.json({ error: "Admin system closed." }, { status: 403 });
  }
  if (ctx.mode === "forbidden" || (!can(ctx, "content.manage") && !can(ctx, "events.publish"))) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = proposalActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid proposal action request." }, { status: 422 });
  }

  const { kind, id, action } = parsed.data;
  const adminSb = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const now = new Date().toISOString();

  try {
    if (action === "approve") {
      if (kind === "collaboration") {
        const { error } = await adminSb
          .from("collaborations")
          .update({
            status: "active",
            publication_status: "published",
            published_at: now,
            updated_at: now,
          })
          .eq("id", id);
        if (error) throw error;
      } else if (kind === "event") {
        const { data: existing } = await adminSb
          .from("events")
          .select("title")
          .eq("id", id)
          .maybeSingle();

        const cleanTitle = (existing?.title || "")
          .replace(/^\[Proposal\]\s*/i, "")
          .trim() || existing?.title || "Community Event";

        const { error } = await adminSb
          .from("events")
          .update({
            title: cleanTitle,
            status: "published",
            published_at: now,
            updated_at: now,
          })
          .eq("id", id);
        if (error) throw error;
      } else if (kind === "opportunity") {
        const { error } = await adminSb
          .from("opportunities")
          .update({
            publication_status: "published",
            publication_consent: true,
            organization_verified: true,
            published_at: now,
            updated_at: now,
          })
          .eq("id", id);
        if (error) throw error;
      } else if (kind === "resource") {
        const { data: existing } = await adminSb
          .from("resources")
          .select("title")
          .eq("id", id)
          .maybeSingle();

        const cleanTitle = (existing?.title || "")
          .replace(/^\[Proposal\]\s*/i, "")
          .trim() || existing?.title || "Community Resource";

        const { error } = await adminSb
          .from("resources")
          .update({
            title: cleanTitle,
            publication_status: "published",
            published_at: now,
            updated_at: now,
          })
          .eq("id", id);
        if (error) throw error;
      }

      // Revalidate public caches immediately so live site updates instantly
      revalidateTag("collaborations", { expire: 0 });
      revalidateTag("events", { expire: 0 });
      revalidateTag("opportunities", { expire: 0 });
      revalidateTag("resources", { expire: 0 });
      revalidateTag("cms-public", { expire: 0 });
      revalidatePath("/collaborations");
      revalidatePath("/events");
      revalidatePath("/opportunities");
      revalidatePath("/resources");
      revalidatePath("/");

      return NextResponse.json({
        ok: true,
        action: "approve",
        message: "Proposal approved successfully and published directly to the live website!",
      });
    }

    if (action === "reject") {
      if (kind === "collaboration") {
        await adminSb
          .from("collaborations")
          .update({ status: "cancelled", publication_status: "archived", updated_at: now })
          .eq("id", id);
      } else if (kind === "event") {
        await adminSb
          .from("events")
          .update({ status: "cancelled", updated_at: now })
          .eq("id", id);
      } else if (kind === "opportunity") {
        await adminSb
          .from("opportunities")
          .update({ publication_status: "archived", updated_at: now })
          .eq("id", id);
      } else if (kind === "resource") {
        await adminSb
          .from("resources")
          .update({ publication_status: "archived", updated_at: now })
          .eq("id", id);
      }

      revalidateTag("collaborations", { expire: 0 });
      revalidateTag("events", { expire: 0 });
      revalidateTag("opportunities", { expire: 0 });
      revalidateTag("resources", { expire: 0 });
      revalidatePath("/collaborations");
      revalidatePath("/events");
      revalidatePath("/opportunities");
      revalidatePath("/resources");

      return NextResponse.json({
        ok: true,
        action: "reject",
        message: "Proposal marked as cancelled/archived.",
      });
    }

    if (action === "delete") {
      if (kind === "collaboration") {
        await adminSb.from("collaborations").delete().eq("id", id);
      } else if (kind === "event") {
        await adminSb.from("events").delete().eq("id", id);
      } else if (kind === "opportunity") {
        await adminSb.from("opportunities").delete().eq("id", id);
      } else if (kind === "resource") {
        await adminSb.from("resources").delete().eq("id", id);
      }

      revalidateTag("collaborations", { expire: 0 });
      revalidateTag("events", { expire: 0 });
      revalidateTag("opportunities", { expire: 0 });
      revalidateTag("resources", { expire: 0 });
      revalidatePath("/collaborations");
      revalidatePath("/events");
      revalidatePath("/opportunities");
      revalidatePath("/resources");

      return NextResponse.json({
        ok: true,
        action: "delete",
        message: "Proposal removed successfully.",
      });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (err) {
    console.error(`Error processing proposal ${action} for ${kind}:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to execute proposal moderation action." },
      { status: 500 }
    );
  }
}
