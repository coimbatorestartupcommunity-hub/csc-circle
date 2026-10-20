import { redirect } from "next/navigation";
import { LoginSuccessTransition } from "@/components/auth/login-success-transition";
import { safeNext } from "@/lib/auth/redirects";
import { createClient, getAuthUser } from "@/lib/supabase/server";

export const metadata = { title: "Signed in · CSC Circle", robots: { index: false, follow: false } };
// This route validates the current auth cookie and intentionally renders per request.
export const instant = false;

export default async function AuthSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getAuthUser();
  if (!user?.email_confirmed_at) redirect("/login");
  const { next } = await searchParams;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("profile_completion")
    .eq("id", user.id)
    .maybeSingle();
  const displayName = typeof user.user_metadata?.full_name === "string"
    ? user.user_metadata.full_name
    : undefined;

  return <LoginSuccessTransition next={safeNext(next)} displayName={displayName} profileComplete={(profile?.profile_completion ?? 0) >= 100} />;
}
