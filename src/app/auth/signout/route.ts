import { clearRecovery } from "@/lib/auth/recovery";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  if (request.headers.get("origin") !== origin) return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) return NextResponse.json({ error: "Could not sign out. Please try again." }, { status: 503 });
  await clearRecovery();
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
