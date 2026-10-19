import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Container } from "@/components/common/container";
import { Suspense } from "react";

export const metadata = { title: "Choose a new password", robots: { index: false, follow: false } };
export const instant = false;

export default function Page() {
  return <section className="bg-brand-cloud py-16 sm:py-24"><Container><AuthCard title="Choose a new password" description="Secure your CSC Circle account."><Suspense fallback={<p>Loading…</p>}><ResetPasswordForm /></Suspense></AuthCard></Container></section>;
}
