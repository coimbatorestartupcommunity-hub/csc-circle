import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Terms and Conditions — Coimbatore Startup Community",
  description: "Official terms of use, electronic contract execution under Section 10A IT Act 2000, and participation rules for CSC Circle.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="Legal & Participation Terms" title="Terms and Conditions" />
      <section className="py-14 sm:py-16">
        <Container className="mx-auto flex max-w-4xl flex-col gap-8 text-brand-secondary">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border pb-4">
            <span className="text-sm font-medium text-brand-muted">Effective Date: November 28, 2026</span>
            <span className="rounded-full bg-brand-cloud px-3 py-1 text-xs font-semibold text-brand-accent">
              Binding Electronic Agreement
            </span>
          </div>

          <p className="text-base leading-relaxed">
            These Terms and Conditions (&ldquo;Terms&rdquo;) constitute a legally binding electronic agreement between you
            (&ldquo;User&rdquo;, &ldquo;Member&rdquo;, or &ldquo;Partner&rdquo;) and{" "}
            <strong>Coimbatore Startup Community (CSC)</strong>, administered in technology partnership with{" "}
            <strong>Logic Intelligence Technologies (LIT)</strong>, governing your access to the CSC Circle platform,
            digital membership cards, event booking portals, founder directories, WhatsApp circles, and ecosystem initiatives.
          </p>

          {/* Section 1: Electronic Execution */}
          <div className="rounded-3xl border border-brand-border bg-brand-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-brand-ink">
              1. Electronic Contract Execution (Section 10A, IT Act 2000)
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-brand-secondary">
              In terms of Section 10A of the Information Technology Act, 2000 and the Indian Contract Act, 1872, contracts
              formed through electronic means (including clicking &ldquo;I Agree&rdquo;, submitting membership claims,
              confirming OTP verification tokens, booking event passes, or cryptographically executing Leadership Charters and MoUs)
              are fully valid and enforceable in law. Your affirmative digital action constitutes an authentic electronic signature.
            </p>
          </div>

          {/* Section 2: Account & Eligibility */}
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold tracking-tight text-brand-ink">2. Eligibility &amp; Account Integrity</h2>
            <p className="text-xs leading-relaxed">
              CSC Circle is designed for startup founders, co-founders, technical builders, investors, mentors, and ecosystem
              enablers. You agree to provide true, verifiable details during profile registration. You are solely responsible for
              maintaining the security of your authentication sessions. You must notify CSC immediately at{" "}
              <a href="mailto:coimbatorestartupcommunity@gmail.com" className="text-brand-accent underline">
                coimbatorestartupcommunity@gmail.com
              </a>{" "}
              if you suspect unauthorized access.
            </p>
          </div>

          {/* Section 3: Digital Membership ID */}
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold tracking-tight text-brand-ink">3. Digital Membership Cards &amp; Apple/Google Wallets</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed">
              <li>
                <strong>Automated 5-Minute Verification:</strong> Membership claims undergo automated cryptographic checks and
                issue an official digital membership ID within 5 minutes. Active members are indexed in the public Coimbatore
                Startup Directory with customizable privacy settings.
              </li>
              <li>
                <strong>Strict Non-Transferability:</strong> An official CSC Digital ID Card is issued exclusively to an individual
                verified member. Passes cannot be sold, rented, lent, or transferred. Attempting to share digital passes or QR tokens
                results in immediate account revocation.
              </li>
              <li>
                <strong>Apple &amp; Google Wallet Integration:</strong> Members are granted a non-exclusive license to store their
                pass in native device wallets for express offline identification at ecosystem events.
              </li>
            </ul>
          </div>

          {/* Section 4: Events, Passes & Virtual Rooms */}
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold tracking-tight text-brand-ink">4. Event Passes, Google Meet &amp; Refund Guarantee</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed">
              <li>
                <strong>Cryptographic Passes:</strong> Confirmed registrations issue a unique QR pass. Passes must be presented at
                entrance check-in kiosks or uploaded to the virtual check-in portal.
              </li>
              <li>
                <strong>1-Hour Virtual Gate:</strong> For virtual meetups, the automated check-in portal unlocks exactly 60 minutes
                prior to the scheduled start time. Attendees must verify their pass reference to access the secure Google Meet link.
              </li>
              <li>
                <strong>100% Refund Guarantee (48-Hour Notice):</strong> If you cancel a paid workshop registration at least 48 hours
                before the scheduled session start time, you receive a full 100% refund. Cancellations under 48 hours are non-refundable.
                If CSC reschedules or cancels a workshop, 100% refunds are automatically disbursed within 5–7 business days to the originating account.
              </li>
            </ul>
          </div>

          {/* Section 5: Anti-Scraping & Cold DMs */}
          <div className="rounded-3xl border border-rose-200 bg-rose-50/40 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-rose-950">5. Strict Anti-Scraping &amp; Anti-Solicitation Prohibition</h2>
            <p className="mt-2 text-xs leading-relaxed text-rose-900">
              Scraping member profiles, downloading founder directories via automated scripts or crawlers, or extracting telephone
              numbers to send unsolicited WhatsApp cold pitches, recruitment messages, or commercial flyers is strictly prohibited.
              Violators face immediate permanent ecosystem bans and prosecution under Section 43 and Section 66 of the Information
              Technology Act, 2000, along with civil claims for statutory data infringement under the DPDP Act 2023.
            </p>
          </div>

          {/* Section 6: Intellectual Property */}
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold tracking-tight text-brand-ink">6. Dual-Entity Intellectual Property Rights</h2>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-2xl border border-brand-border bg-brand-white p-4 shadow-xs">
                <strong className="block text-brand-ink text-sm">CSC Community Marks</strong>
                <p className="mt-1 text-brand-secondary">
                  CSC Circle, Coimbatore Startup Community, logos, and event banners are proprietary marks of Coimbatore Startup Community.
                </p>
              </div>
              <div className="rounded-2xl border border-brand-border bg-brand-white p-4 shadow-xs">
                <strong className="block text-brand-ink text-sm">LIT Platform Technology</strong>
                <p className="mt-1 text-brand-secondary">
                  The underlying software architecture, APIs, cryptographic minting algorithms, and UI components remain the exclusive intellectual property of Logic Intelligence Technologies.
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed">
              Founders retain 100% complete ownership over all startup pitch decks, business blueprints, trade secrets, and proprietary
              materials submitted or presented on the platform.
            </p>
          </div>

          {/* Section 7: Limitation of Liability */}
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold tracking-tight text-brand-ink">7. Disclaimers &amp; Limitation of Liability</h2>
            <p className="text-xs leading-relaxed">
              CSC Circle is a non-transactional ecosystem platform designed to accelerate founder collaboration and peer networking.
              CSC does not guarantee angel investment, grant awards, customer revenue, or commercial outcomes. To the fullest extent
              permitted by applicable Indian law, CSC and Logic Intelligence Technologies disclaim all liability for indirect,
              incidental, or consequential damages resulting from third-party interactions or platform downtime.
            </p>
          </div>

          {/* Section 8: Dispute Resolution */}
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold tracking-tight text-brand-ink">8. Governing Law &amp; Exclusive Jurisdiction</h2>
            <p className="text-xs leading-relaxed">
              These Terms are governed by and construed in accordance with the laws of the Republic of India. Any controversy,
              claim, or dispute arising out of or relating to these Terms shall first be referred to amicable conciliation for a
              period of 30 days. If unresolved, it shall be settled by binding arbitration seated exclusively in{" "}
              <strong>Coimbatore, Tamil Nadu, India</strong>, under the provisions of the Arbitration and Conciliation Act, 1996.
              The competent civil courts of Coimbatore shall have exclusive supervisory jurisdiction.
            </p>
          </div>

          {/* Section 9: Inquiries */}
          <div className="rounded-2xl border border-brand-border bg-brand-cloud/40 p-5 text-xs">
            <strong className="block text-brand-ink text-sm">Questions Regarding Legal Terms?</strong>
            <p className="mt-1 leading-relaxed">
              Reach our legal and administrative compliance desk at{" "}
              <a href="mailto:coimbatorestartupcommunity@gmail.com" className="font-semibold text-brand-accent underline">
                coimbatorestartupcommunity@gmail.com
              </a>{" "}
              or{" "}
              <a href="mailto:coimbatorestartup.president@gmail.com" className="font-semibold text-brand-accent underline">
                coimbatorestartup.president@gmail.com
              </a>
              . For personal data handling questions, review our{" "}
              <Link href="/privacy" className="font-semibold text-brand-accent underline">Privacy Policy</Link>.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
