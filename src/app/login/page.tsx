import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/common/container";
import { AmbientPastelBackground } from "@/components/motion";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { safeNext } from "@/lib/auth/redirects";
import { Icon, type IconName } from "@/components/common/icon";
import { getAuthUser } from "@/lib/supabase/server";
import { memberExperience } from "@/lib/content/home";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Welcome Back to CSC Circle to manage your community profile, explore member opportunities, and access your digital membership experience.",
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
  // Already signed in → go to the member area.
  const { next } = await searchParams;
  const user = await getAuthUser();
  if (user) redirect(`/auth/complete?next=${encodeURIComponent(safeNext(next))}`);

  return (
    <section className="relative overflow-hidden">
      <AmbientPastelBackground intensity="subtle" />
      <Container className="flex flex-col items-center gap-14 py-16 sm:py-24">
        <AuthCard title="Welcome Back to CSC Circle" description="Sign in to access your community profile, digital membership ID, event registrations, and CSC opportunities."><LoginForm /></AuthCard>

        <div className="w-full max-w-3xl">
          <h2 className="text-center text-sm font-semibold tracking-wide text-brand-muted uppercase">
            What CSC membership brings
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {memberExperience.cards.map((card) => (
              <li
                key={card.title}
                className="flex flex-col gap-2 rounded-2xl bg-brand-white/70 p-4 ring-1 ring-brand-border"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-brand-purple text-brand-accent">
                  <Icon name={card.icon as IconName} className="size-4.5" />
                </span>
                <span className="text-sm font-semibold text-brand-ink">
                  {card.title}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
