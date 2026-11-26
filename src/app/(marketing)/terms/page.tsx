import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "Terms of Use and participation agreement for the CSC Circle community platform.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="Legal & Agreement" title="Terms and Conditions" />
      <section className="py-14">
        <Container className="mx-auto flex max-w-3xl flex-col gap-6 text-brand-secondary">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border pb-4">
            <span className="text-sm font-medium text-brand-muted">Effective Date: November 22, 2026</span>
            <span className="rounded-full bg-brand-cloud px-3 py-1 text-xs font-semibold text-brand-accent">
              Official Platform Terms
            </span>
          </div>

          <p className="text-base leading-relaxed">
            These Terms and Conditions (&ldquo;Terms&rdquo;) govern your access to and use of the <strong>CSC Circle</strong> platform,
            digital membership cards, event booking portals, founder directories, and related community initiatives operated by the{" "}
            <strong>Coimbatore Startup Community (CSC)</strong> in collaboration with Technical Partner{" "}
            <strong>Logic Intelligence Technologies (LIT)</strong>.
          </p>
          <p className="text-sm">
            By creating an account, claiming a digital membership card, booking an event pass, or browsing the directory,
            you explicitly agree to be bound by these Terms. If you do not agree, you must discontinue use of the platform immediately.
          </p>

          {/* Section: Platform Use */}
          <h2 className="text-xl font-bold tracking-tight text-brand-ink">1. Platform Eligibility &amp; Account Security</h2>
          <p>
            CSC Circle is designed for startup founders, aspiring entrepreneurs, builders, creators, students, and ecosystem mentors.
            You must provide true, accurate, and complete information when registering or updating your profile.
            You are solely responsible for maintaining the confidentiality of your authentication credentials and for all activities
            occurring under your account. You must notify CSC immediately of any unauthorized account activity.
          </p>

          {/* Section: Digital ID & Membership */}
          <h2 className="text-xl font-bold tracking-tight text-brand-ink">2. Membership &amp; Digital Membership ID Cards</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>
              <strong>Automated 5-Minute Verification &amp; Directory Listing:</strong> Membership claims are subject to automated verification and issue within 5 minutes.
              Active members are automatically listed in the public CSC Member Directory with their name, role, city, bio, skills, optional portrait photo, and published startup affiliations (WhatsApp contact remains private unless opted in).
              CSC administrators reserve the right to manually audit or revoke memberships if information provided is discovered to be fraudulent or misleading.
            </li>
            <li>
              <strong>Non-Transferability:</strong> An official CSC Digital Membership ID is issued exclusively to an individual member.
              Cards cannot be transferred, sold, shared, or utilized by third parties.
            </li>
            <li>
              <strong>Revocation &amp; Suspension:</strong> CSC reserves the right to suspend or terminate membership credentials without liability
              if a member engages in harassment, unauthorized commercial spam, identity misrepresentation, or violation of community guidelines.
            </li>
          </ul>

          {/* Section: Events, Passes & Virtual Rooms */}
          <h2 className="text-xl font-bold tracking-tight text-brand-ink">3. Event Ticketing, Passes &amp; Google Meet Portal</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>
              <strong>Cryptographic Passes:</strong> Confirmed event registrations issue an individual encrypted QR code pass.
              Each pass is valid for one person and cannot be exchanged or transferred.
            </li>
            <li>
              <strong>Virtual Check-in Window:</strong> For virtual gatherings (including the CSC Joint Online Meeting), the automated check-in
              portal opens exactly <strong>1 hour before scheduled session start</strong> (e.g., at 2:00 PM IST for 3:00 PM sessions).
              Attendees must scan or enter their pass reference to access the Google Meet room link.
            </li>
            <li>
              <strong>Virtual Conduct:</strong> Attendees must maintain professional decorum during sessions. CSC administrators reserve the
              right to remove disruptive attendees, disable unmuted audio, or block users violating session rules.
            </li>
          </ul>

          {/* Section: Paid Workshops & Refunds */}
          <h2 className="text-xl font-bold tracking-tight text-brand-ink">4. Payments, UPI Reconciliation &amp; Refund Policy</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>
              <strong>Payment Verification:</strong> Paid workshops or masterclasses require UPI transaction reference (UTR) verification.
              Seats are confirmed only upon successful automated or manual reconciliation.
            </li>
            <li>
              <strong>Cancellation &amp; Refunds:</strong> If you cancel a paid workshop registration at least <strong>48 hours before the event start time</strong>,
              you are eligible for a 100% refund. Cancellations made within 48 hours of event start are non-refundable.
            </li>
            <li>
              <strong>Event Cancellation by Organizers:</strong> In the event that CSC reschedules or cancels a paid workshop, registered attendees
              will automatically receive a 100% refund to the original payment source within 5–7 business days.
            </li>
          </ul>

          {/* Section: Founder Submissions & Startup Directory */}
          <h2 className="text-xl font-bold tracking-tight text-brand-ink">5. Startup Directory &amp; User Submissions</h2>
          <p>
            When submitting a startup profile, you warrant that you are authorized to represent the venture and that all uploaded logos,
            descriptions, and claims are accurate and free from third-party copyright infringement.
            All startup listings undergo community editorial review prior to publication. CSC reserves the right to unpublish listings
            that are deceptive, inactive, or inconsistent with community standards.
          </p>

          {/* Section: Intellectual Property */}
          <h2 className="text-xl font-bold tracking-tight text-brand-ink">6. Intellectual Property Rights</h2>
          <p>
            All trademarks, logos, brand assets, software architecture, UI layouts, and graphics of CSC Circle,
            Coimbatore Startup Community, and Logic Intelligence Technologies (LIT) remain the exclusive intellectual property of their
            respective owners. You may not reproduce, copy, scrape, or distribute platform assets without prior written consent.
          </p>

          {/* Section: Limitation of Liability */}
          <h2 className="text-xl font-bold tracking-tight text-brand-ink">7. Disclaimers &amp; Limitation of Liability</h2>
          <p className="text-sm">
            CSC Circle is a community platform designed to foster networking and founder peer support. CSC does not guarantee venture funding,
            angel investment, revenue generation, or specific business results from participating in events or directory listings.
            To the maximum extent permitted by law, CSC and LIT disclaim liability for indirect, incidental, or consequential damages
            arising from platform use or third-party interactions.
          </p>

          {/* Section: Governing Law & Jurisdiction */}
          <h2 className="text-xl font-bold tracking-tight text-brand-ink">8. Governing Law &amp; Legal Jurisdiction</h2>
          <p className="text-sm">
            These Terms are governed by and construed in accordance with the laws of the Republic of India.
            Any legal dispute, action, or proceeding arising under or in connection with CSC Circle shall be subject to the exclusive
            jurisdiction of the competent civil courts of <strong>Coimbatore, Tamil Nadu, India</strong>.
          </p>

          {/* Section: Contact */}
          <div className="rounded-2xl border border-brand-border bg-brand-cloud/40 p-5 text-sm">
            <strong className="block text-brand-ink">Questions About Terms?</strong>
            <p className="mt-1">
              Contact our legal and administrative desk at{" "}
              <a href="mailto:coimbatorestartupcommunity@gmail.com" className="font-semibold text-brand-accent underline">
                coimbatorestartupcommunity@gmail.com
              </a>{" "}
              or{" "}
              <a href={`mailto:${siteConfig.social.email}`} className="font-semibold text-brand-accent underline">
                {siteConfig.social.email}
              </a>
              . For personal data inquiries, review our{" "}
              <Link href="/privacy" className="font-semibold text-brand-accent underline">Privacy Policy</Link>.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
