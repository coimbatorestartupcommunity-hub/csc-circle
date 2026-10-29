import { NextResponse } from "next/server";
import { can, getAdminContext } from "@/lib/admin/gate";
import { createClient } from "@/lib/supabase/server";
import { collaborationOrganizationSchema } from "@/lib/validations/collaboration";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  }
  const context = await getAdminContext();
  if (context.mode !== "live" || !can(context, "content.manage")) {
    return NextResponse.json({ error: "You are not authorized to manage partner organizations." }, { status: 403 });
  }
  const parsed = collaborationOrganizationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the organization details and try again." }, { status: 422 });

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("csc_save_collaboration_organization", {
    payload: {
      id: parsed.data.id ?? null,
      name: parsed.data.name,
      slug: parsed.data.slug,
      organization_type: parsed.data.organizationType,
      description: parsed.data.description,
      logo_path: parsed.data.logoPath,
      website_url: parsed.data.websiteUrl,
      publication_approved: parsed.data.publicationApproved,
      publication_status: "published",
    },
  });
  if (error || !id) {
    const forbidden = error?.code === "42501";
    return NextResponse.json({ error: forbidden ? "You are not authorized to manage partner organizations." : "The organization could not be saved. The slug may already exist." }, { status: forbidden ? 403 : 422 });
  }
  return NextResponse.json({ ...parsed.data, id });
}
