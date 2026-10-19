"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WhatsappIcon } from "@/components/common/brand-icons";
import { brandAssets, siteConfig } from "@/lib/content/site";

/** Google SVG mark (not in lucide). */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export function LoginCard({ authError }: { authError?: boolean }) {
  const [mode, setMode] = React.useState<"choose" | "email">("choose");
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState<null | "google" | "email">(null);
  const [error, setError] = React.useState<string | null>(
    authError ? "Sign-in didn't complete. Please try again." : null,
  );
  const [sent, setSent] = React.useState(false);

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?next=/member`
      : undefined;

  async function handleGoogle() {
    setError(null);
    setLoading("google");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) {
        setError(
          "Google sign-in isn't available yet. It activates once the Google provider is enabled for this project.",
        );
        setLoading(null);
      }
      // On success the browser redirects to Google.
    } catch {
      setError("Something went wrong starting Google sign-in.");
      setLoading(null);
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading("email");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        setError(error.message || "Couldn't send the sign-in link.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Something went wrong sending the sign-in link.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="flex flex-col items-center gap-6 rounded-[2rem] bg-brand-white p-7 text-center shadow-sm ring-1 ring-brand-border sm:p-9">
        <Image
          src={brandAssets.cscIcon}
          alt={`${siteConfig.legalName} logo`}
          width={56}
          height={56}
          className="rounded-full ring-1 ring-brand-border"
          priority
        />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-brand-ink">
            Welcome to CSC Circle.
          </h1>
          <p className="font-serif text-lg text-brand-accent">
            Your next connection starts here.
          </p>
          <p className="mt-1 text-sm leading-relaxed text-brand-muted">
            Sign in to manage your community profile, explore member
            opportunities, and access your CSC digital membership experience.
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="w-full rounded-xl bg-brand-red/60 px-3 py-2 text-sm text-brand-ink"
          >
            {error}
          </p>
        ) : null}

        {sent ? (
          <div className="flex w-full flex-col items-center gap-2 rounded-xl bg-green-50 px-4 py-5 text-sm text-green-800">
            <CheckCircle2 className="size-6" />
            <p className="font-medium">Check your email</p>
            <p className="text-green-700">
              We sent a secure sign-in link to <strong>{email}</strong>.
            </p>
          </div>
        ) : mode === "choose" ? (
          <div className="flex w-full flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              disabled={loading !== null}
              className="h-11 w-full gap-2.5 text-[15px]"
            >
              {loading === "google" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <GoogleMark className="size-5" />
              )}
              Continue with Google
            </Button>
            <Button
              type="button"
              onClick={() => setMode("email")}
              className="h-11 w-full gap-2.5 text-[15px]"
            >
              <Mail className="size-4" />
              Continue with Email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleEmail} className="flex w-full flex-col gap-3 text-left">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-email">Email address</Label>
              <Input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11"
              />
            </div>
            <Button type="submit" disabled={loading !== null} className="h-11 w-full gap-2">
              {loading === "email" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Mail className="size-4" />
              )}
              Send sign-in link
            </Button>
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="inline-flex items-center justify-center gap-1 text-sm text-brand-muted hover:text-brand-ink"
            >
              <ArrowLeft className="size-3.5" /> Back
            </button>
          </form>
        )}

        <a
          href={siteConfig.social.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-secondary underline-offset-4 hover:text-brand-ink hover:underline"
        >
          <WhatsappIcon className="size-4" />
          Or join the WhatsApp community
        </a>

        <p className="text-xs text-brand-muted">
          By continuing you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-brand-ink">
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-brand-ink">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      <div className="mt-5 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-ink"
        >
          <ArrowLeft className="size-4" /> Back to Home
        </Link>
      </div>
    </div>
  );
}
