import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { can, getAdminContext } from "@/lib/admin/gate";
import { createClient } from "@/lib/supabase/server";
import { collaborationSaveSchema } from "@/lib/validations/collaboration";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  }

  const context = await getAdminContext();
  if (context.mode !== "live" || !can(context, "content.manage")) {
    return NextResponse.json({ error: "You are not authorized to manage collaborations." }, { status: 403 });
  }

  const parsed = collaborationSaveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the collaboration details and try again." }, { status: 422 });
  }

  const value = parsed.data;
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("csc_save_collaboration", {
    payload: {
      id: value.id ?? null,
      slug: value.slug,
      title: value.title,
      tagline: value.tagline,
      summary: value.summary,
      story: value.story,
      category: value.category,
      status: value.status,
      publication_status: value.publicationStatus,
      featured_image_path: value.featuredImagePath,
      partner_ids: value.partnerIds,
      event_id: value.eventId,
      // The editor uses Asia/Kolkata wall time; store it as an explicit +05:30 instant.
      event_date: value.eventDate ? new Date(`${value.eventDate}:00+05:30`).toISOString() : "",
      venue_name: value.venueName,
      venue_address: value.venueAddress,
      seo_title: value.seoTitle,
      meta_description: value.metaDescription,
      highlights: value.highlights,
      media: value.media,
    },
  });

  if (error || !id) {
    const forbidden = error?.code === "42501";
    return NextResponse.json(
      { error: forbidden ? "You are not authorized to manage collaborations." : "The collaboration could not be saved. Check for a duplicate slug or invalid partner/event selection." },
      { status: forbidden ? 403 : 422 },
    );
  }

  revalidateTag("collaborations", "max");
  revalidatePath("/collaborations");
  revalidatePath(`/collaborations/${value.slug}`);
  revalidatePath("/admin/collaborations");
  return NextResponse.json({ id, slug: value.slug });
}
