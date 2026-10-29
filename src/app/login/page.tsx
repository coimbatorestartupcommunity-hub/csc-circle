import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { safeNext } from "@/lib/auth/redirects";
import { getAuthUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to connect with the community, manage your profile, discover founders, and participate in CSC events.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

// Reads the session + searchParams, so this route blocks on the server.
export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  await connection();
  // Already signed in → go to the member area.
  const { next } = await searchParams;
  const user = await getAuthUser();
  if (user) redirect(`/auth/complete?next=${encodeURIComponent(safeNext(next))}`);

  return (
    <section className="relative flex min-h-[100svh] flex-1 items-center justify-center overflow-y-auto bg-[radial-gradient(ellipse_at_top_left,#f1ecff_0%,transparent_48%),radial-gradient(ellipse_at_bottom_right,#e7f3ff_0%,transparent_46%),#f7f9fc] px-4 py-6 sm:px-6">
      <AuthCard
        title="Welcome to CSC Circle"
        description="Sign in to connect with the community, manage your profile, discover founders, and participate in CSC events."
      >
        <LoginForm />
      </AuthCard>
    </section>
  );
}
