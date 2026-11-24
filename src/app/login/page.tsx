import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { safeNext } from "@/lib/auth/redirects";
import { getAuthUser } from "@/lib/supabase/server";
import { getWebsiteMaintenanceConfig } from "@/lib/services/system-settings";
import { ShieldAlert } from "lucide-react";

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
  const [params, user, maintenance] = await Promise.all([
    searchParams,
    getAuthUser(),
    getWebsiteMaintenanceConfig(),
  ]);
  const { next } = params;
  if (user) redirect(`/auth/complete?next=${encodeURIComponent(safeNext(next))}`);

  return (
    <section className="relative flex min-h-[100svh] flex-1 items-center justify-center overflow-y-auto bg-[radial-gradient(ellipse_at_top_left,#f1ecff_0%,transparent_48%),radial-gradient(ellipse_at_bottom_right,#e7f3ff_0%,transparent_46%),#f7f9fc] px-4 py-6 sm:px-6">
      <div className="w-full max-w-md space-y-3">
        {maintenance.enabled && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs shadow-sm">
            <div className="flex items-center gap-2 font-bold mb-1 text-amber-800 dark:text-amber-300">
              <ShieldAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Platform Maintenance Active — Admin Access Only</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300/80">
              The community portal is currently under scheduled maintenance. Regular member sign-ins are temporarily suspended. Only verified platform administrators may sign in.
            </p>
          </div>
        )}

        <AuthCard
          title={maintenance.enabled ? "Administrator Sign In" : "Welcome to CSC Circle"}
          description={
            maintenance.enabled
              ? "Sign in with your verified administrative credentials to access the operations hub during maintenance mode."
              : "Sign in to connect with the community, manage your profile, discover founders, and participate in CSC events."
          }
        >
          <LoginForm />
        </AuthCard>
      </div>
    </section>
  );
}
