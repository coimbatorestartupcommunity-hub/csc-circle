import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { can, getAdminContext } from "@/lib/admin/gate";
import { saveCommunityUpdate } from "@/lib/admin/cms";
import { communityUpdateSaveSchema } from "@/lib/validations/cms";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  const context = await getAdminContext();
  if (context.mode !== "live" || !context.userId || !can(context, "content.manage")) return NextResponse.json({ error: "You are not authorized to manage updates." }, { status: 403 });
  const parsed = communityUpdateSaveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the update details and try again." }, { status: 422 });
  const result = await saveCommunityUpdate(parsed.data, context.userId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 422 });
  revalidatePath("/updates");
  revalidatePath(`/updates/${result.slug}`);
  revalidatePath("/");
  return NextResponse.json({ ok: true, ...result }, { status: parsed.data.id ? 200 : 201 });
}
