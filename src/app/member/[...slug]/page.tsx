import { redirect } from "next/navigation";

export const instant = false;

interface MemberCatchAllProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function MemberCatchAllRedirect({ params }: MemberCatchAllProps) {
  const resolved = await params;
  const path = resolved?.slug?.join("/") ?? "";
  redirect(path ? `/profile/${path}` : "/profile");
}
