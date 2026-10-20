import type { Metadata } from "next";
import { AdminInvitationAcceptance } from "@/components/admin/admin-invitation-acceptance";

export const metadata: Metadata = { title: "Accept Administrator Invitation", robots: { index: false, follow: false } };
export default function AcceptAdminInvitationPage() {
  return <main className="min-h-screen bg-brand-cloud px-4 py-12 sm:py-20"><div className="mx-auto max-w-2xl"><AdminInvitationAcceptance /></div></main>;
}
