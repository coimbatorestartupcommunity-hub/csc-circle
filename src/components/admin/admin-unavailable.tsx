import * as React from "react";
import { ShieldX, Lock } from "lucide-react";
import { Container } from "@/components/common/container";
import { CtaLink } from "@/components/common/cta-link";

/**
 * Shown when the admin area is not accessible: production without a session
 * (closed) or a signed-in non-admin (forbidden). No admin data is exposed.
 */
export function AdminUnavailable({ forbidden }: { forbidden?: boolean }) {
  return (
    <section className="py-24">
      <Container className="flex max-w-lg flex-col items-center gap-5 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-brand-red text-brand-ink">
          {forbidden ? <ShieldX className="size-7" /> : <Lock className="size-7" />}
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-brand-ink">
          {forbidden ? "You don't have admin access." : "Administrator sign-in required."}
        </h1>
        <p className="text-brand-secondary">
          {forbidden
            ? "Your account isn't provisioned with an administrator role. Contact a CSC Super Admin if you believe this is a mistake."
            : "This area is for authorised CSC administrators. Please sign in with an administrator account."}
        </p>
        <CtaLink href={forbidden ? "/member" : "/login"} size="lg">
          {forbidden ? "Back to member area" : "Sign in"}
        </CtaLink>
      </Container>
    </section>
  );
}
