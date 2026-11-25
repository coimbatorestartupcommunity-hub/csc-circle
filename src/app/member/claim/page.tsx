import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function MemberClaimRedirect() {
  const supabase = await createClient();
  const { data: claimsResult } = await supabase.auth.getClaims();
  const userId = claimsResult?.claims?.sub;

  if (userId) {
    const { data: adminRole } = await supabase
      .from("admin_roles")
      .select("role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (adminRole) {
      redirect("/admin/membership-claims");
    }
  }

  redirect("/profile/claim");
}
