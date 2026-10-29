import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { can, getAdminContext } from "@/lib/admin/gate";
import { cmsActionSchema } from "@/lib/validations/cms";
import { setResourceStatus } from "@/lib/admin/cms";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  }
  const context = await getAdminContext();
  if (context.mode !== "live" || !context.userId || !can(context, "content.manage")) {
    return NextResponse.json({ error: "You are not authorized to manage resources." }, { status: 403 });
  }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid resource." }, { status: 404 });
  const parsed = cmsActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Unknown action." }, { status: 422 });
  const result = await setResourceStatus(id, parsed.data.action, context.userId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 422 });
  revalidatePath("/resources");
  revalidatePath(`/resources/${result.slug}`);
  return NextResponse.json({ ok: true, wasFirst: result.wasFirst });
}
