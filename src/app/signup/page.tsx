import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";
import { Container } from "@/components/common/container";
import { Suspense } from "react";

export const metadata = { title: "Create your CSC Circle account", robots: { index: false, follow: false } };
export const instant = false;

export default function Page() {
  return <section className="bg-brand-cloud py-16 sm:py-24"><Container><AuthCard title="Create your CSC Circle account" description="Join the community and set up your profile."><Suspense fallback={<p>Loading…</p>}><SignupForm /></Suspense></AuthCard></Container></section>;
}
