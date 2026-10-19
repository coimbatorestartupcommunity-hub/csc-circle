import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Container } from "@/components/common/container";
import { Suspense } from "react";

export const metadata = { title: "Reset your password", robots: { index: false, follow: false } };
export const instant = false;

export default function Page() {
  return <section className="bg-brand-cloud py-16 sm:py-24"><Container><AuthCard title="Reset your password" description="Request a recovery link for your account."><Suspense fallback={<p>Loading…</p>}><ForgotPasswordForm /></Suspense></AuthCard></Container></section>;
}
