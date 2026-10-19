import { MemberPageHeader } from "@/components/member/member-page-header";
import { RegistrationsClient } from "@/components/member/registrations-client";
import { EmptyState } from "@/components/common/empty-state";
import { CalendarX } from "lucide-react";
import Link from "next/link";
import { memberServices } from "@/lib/services/member/services";

export const metadata = { title: "My Events" };

export default async function MemberEventsPage() {
  const res = await memberServices.listRegistrations();
  const registrations = res.ok ? res.data : [];

  return (
    <>
      <MemberPageHeader
        title="My events"
        description="Your CSC event registrations, grouped by status."
      />
      {registrations.length > 0 ? (
        <RegistrationsClient registrations={registrations} />
      ) : (
        <EmptyState
          icon={CalendarX}
          title="No event registrations yet."
          description="Register for CSC meetups, pitch sessions and workshops to see them here."
        >
          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-ink px-4 py-2 text-sm font-medium text-brand-white hover:bg-brand-ink/90"
          >
            Explore CSC Events
          </Link>
        </EmptyState>
      )}
    </>
  );
}
