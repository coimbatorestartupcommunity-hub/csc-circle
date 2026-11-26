export type AgreementType =
  | "tech_partner"
  | "leadership_charter"
  | "strategic_mou"
  | "event_collaboration"
  | "sponsorship"
  | "speaker_mentor"
  | "custom";

export type LeadershipRoleKey =
  | "founder"
  | "co_founder"
  | "ceo"
  | "cto"
  | "cco"
  | "coo"
  | "cbo";

export interface AgreementSection {
  heading: string;
  clauses: string[];
}

export interface AgreementTypeMeta {
  type: AgreementType;
  label: string;
  shortLabel: string;
  description: string;
  defaultTitle: string;
  defaultEyebrow: string;
  defaultSubtitle: string;
  defaultDuration: string;
}

export const AGREEMENT_TYPE_META: Record<AgreementType, AgreementTypeMeta> = {
  tech_partner: {
    type: "tech_partner",
    label: "Exclusive Technology Partner Agreement",
    shortLabel: "Tech Partner (LIT)",
    description:
      "Designates Logic Intelligence Technologies (LIT) as the sole & exclusive Official Technology Partner of CSC.",
    defaultTitle: "EXCLUSIVE TECHNOLOGY PARTNER AGREEMENT",
    defaultEyebrow: "Official Technical Infrastructure & Platform Mandate",
    defaultSubtitle: "COIMBATORE STARTUP COMMUNITY × LOGIC INTELLIGENCE TECHNOLOGIES",
    defaultDuration: "Perpetual / Auto-Renewing",
  },
  leadership_charter: {
    type: "leadership_charter",
    label: "Executive Leadership Charter (7 Leaders)",
    shortLabel: "Leadership Charter",
    description:
      "Role mandate, fiduciary duty, conflict-of-interest disclosure, and handover charter for CSC's 7 Core Leaders.",
    defaultTitle: "EXECUTIVE LEADERSHIP CHARTER",
    defaultEyebrow: "Coimbatore Startup Community Core Leadership Mandate",
    defaultSubtitle: "GOVERNANCE, FIDUCIARY DUTY & OPERATIONAL AUTHORITY",
    defaultDuration: "Active Tenure",
  },
  strategic_mou: {
    type: "strategic_mou",
    label: "Strategic Partnership MoU",
    shortLabel: "Partnership MoU",
    description:
      "Ecosystem, college, incubator, or brand Memorandum of Understanding with NDA, brand rules, and DPDP compliance.",
    defaultTitle: "STRATEGIC PARTNERSHIP MEMORANDUM OF UNDERSTANDING",
    defaultEyebrow: "Ecosystem Collaboration & Mutual Growth Charter",
    defaultSubtitle: "COIMBATORE STARTUP COMMUNITY ECOSYSTEM ALLIANCE",
    defaultDuration: "12 Months",
  },
  event_collaboration: {
    type: "event_collaboration",
    label: "Event Collaboration & Co-Hosting Agreement",
    shortLabel: "Event Co-Hosting",
    description:
      "Joint meetup, hackathon, or workshop agreement defining venue, ticketing, data ownership, and liability.",
    defaultTitle: "EVENT COLLABORATION & CO-HOSTING AGREEMENT",
    defaultEyebrow: "Joint Community Program & Event Execution Pact",
    defaultSubtitle: "RESPONSIBILITIES, TICKETING & ON-GROUND GOVERNANCE",
    defaultDuration: "Event Term",
  },
  sponsorship: {
    type: "sponsorship",
    label: "Sponsorship & Brand Partner Agreement",
    shortLabel: "Sponsorship",
    description:
      "Cash or in-kind sponsorship contract covering deliverables, UTR reconciliation, refunds, and pitch rules.",
    defaultTitle: "SPONSORSHIP & BRAND PARTNER AGREEMENT",
    defaultEyebrow: "Official Community Event & Program Sponsorship",
    defaultSubtitle: "DELIVERABLES, BRAND PLACEMENT & COMMERCIAL TERMS",
    defaultDuration: "Program / Event Term",
  },
  speaker_mentor: {
    type: "speaker_mentor",
    label: "Speaker, Mentor & Advisor Agreement",
    shortLabel: "Speaker / Mentor",
    description:
      "Non-fiduciary advisory charter with founder pitch confidentiality (NDA) and social media recording release.",
    defaultTitle: "SPEAKER, MENTOR & ADVISOR AGREEMENT",
    defaultEyebrow: "Ecosystem Guidance & Media Release Charter",
    defaultSubtitle: "CONFIDENTIALITY, ADVISORY BOUNDARIES & MEDIA CONSENT",
    defaultDuration: "12 Months / Session Term",
  },
  custom: {
    type: "custom",
    label: "Custom Agreement",
    shortLabel: "Custom",
    description:
      "Author custom legal sections and clauses for special one-off community arrangements.",
    defaultTitle: "COMMUNITY COOPERATION AGREEMENT",
    defaultEyebrow: "Coimbatore Startup Community Official Instrument",
    defaultSubtitle: "BESPOKE TERMS & MUTUAL COVENANTS",
    defaultDuration: "12 Months",
  },
};

export interface LeadershipProfileTemplate {
  key: LeadershipRoleKey;
  roleTitle: string;
  defaultName: string;
  externalVenture: string;
  mandateSummary: string;
}

export const LEADERSHIP_PROFILES: Record<LeadershipRoleKey, LeadershipProfileTemplate> = {
  founder: {
    key: "founder",
    roleTitle: "Founder, Coimbatore Startup Community",
    defaultName: "K. N. Reyash",
    externalVenture: "Belvoria (Founder) & Independent Startup Developer",
    mandateSummary:
      "Provides overall community vision, strategic direction, final approval of community initiatives, founder network stewardship, and institutional representation of CSC.",
  },
  co_founder: {
    key: "co_founder",
    roleTitle: "Co-Founder, Coimbatore Startup Community",
    defaultName: "E. R. Sharan",
    externalVenture: "CECIL Groups of Companies & Industries (Founder)",
    mandateSummary:
      "Provides co-founding strategic leadership, high-level industry connections, institutional partnerships, and ecosystem expansion across Coimbatore and Tamil Nadu.",
  },
  ceo: {
    key: "ceo",
    roleTitle: "Chief Executive Officer (CEO), Coimbatore Startup Community",
    defaultName: "Mirra Mahendran",
    externalVenture: "Independent Executive Leadership",
    mandateSummary:
      "Leads day-to-day execution, cross-functional team coordination, task follow-ups, and operational delivery of CSC programs following Founder alignment.",
  },
  cto: {
    key: "cto",
    roleTitle: "Chief Technology Officer (CTO), Coimbatore Startup Community",
    defaultName: "Vikash Saravanan",
    externalVenture: "Logic Intelligence Technologies — LIT (Founder & CEO)",
    mandateSummary:
      "Leads all CSC technology strategy, platform architecture, cybersecurity, software engineering, Digital ID approvals, and technical infrastructure delivered exclusively through Logic Intelligence Technologies (LIT).",
  },
  cco: {
    key: "cco",
    roleTitle: "Chief Community Officer (CCO), Coimbatore Startup Community",
    defaultName: "Swathi",
    externalVenture: "Community & Ecosystem Engagement",
    mandateSummary:
      "Spearheads member onboarding, community engagement, event coordination, founder communication channels, and member retention.",
  },
  coo: {
    key: "coo",
    roleTitle: "Chief Operating Officer (COO), Coimbatore Startup Community",
    defaultName: "Kishore C",
    externalVenture: "APARÈ Clothing (Founder)",
    mandateSummary:
      "Owns end-to-end event operations, venue logistics, vendor coordination, on-ground check-in execution, and operational excellence.",
  },
  cbo: {
    key: "cbo",
    roleTitle: "Chief Brand Officer (CBO), Coimbatore Startup Community",
    defaultName: "Jaibharath V",
    externalVenture: "Flickkora Agency (Founder)",
    mandateSummary:
      "Leads CSC brand identity, visual storytelling, video/reel production, event media coverage, and digital brand presence.",
  },
};

export interface BuildAgreementInput {
  agreementType: AgreementType;
  recipientName: string;
  recipientRole: string;
  recipientOrg: string;
  recipientEmail: string;
  effectiveDate: string;
  durationLabel: string;
  leadershipRole?: LeadershipRoleKey;
  formData?: Record<string, string>;
  customSections?: AgreementSection[];
}

export function buildAgreementSections(input: BuildAgreementInput): AgreementSection[] {
  const fd = input.formData ?? {};
  const partnerName = input.recipientOrg || input.recipientName;
  const effective = input.effectiveDate || new Date().toISOString().slice(0, 10);
  const duration = input.durationLabel || AGREEMENT_TYPE_META[input.agreementType].defaultDuration;

  switch (input.agreementType) {
    case "tech_partner": {
      const domain = fd.platformDomain || "csc.logicintelligencetechnologies.in";
      const slaNote =
        fd.slaNote ||
        "Target 99.5% operational uptime with proactive health monitoring, rapid incident response, and emergency maintenance authority.";
      const specialClauses = fd.specialClauses?.trim();

      const sections: AgreementSection[] = [
        {
          heading: "1. Parties, Recitals & Sole Exclusive Appointment",
          clauses: [
            `1.1 Formal Contracting Parties: This Exclusive Technology Partner Agreement ("Agreement") is formally made and entered into as of ${effective} by and between Coimbatore Startup Community ("CSC"), an unincorporated non-profit startup collective headquartered in Coimbatore, Tamil Nadu, and Logic Intelligence Technologies ("LIT"), an elite enterprise technology enterprise represented by its Founder & CEO, ${input.recipientName} (${input.recipientRole || "Founder & CEO, LIT / Chief Technology Officer, CSC"}).`,
            `1.2 Sole and Exclusive Technology Partner Appointment: CSC hereby formally designates and appoints Logic Intelligence Technologies (LIT) as the sole and exclusive Official Technology Partner of Coimbatore Startup Community across all digital properties, core domains (${domain}), web architectures, member database clusters, cryptographic Digital ID card engines, and event infrastructure.`,
            `1.3 Negative Covenant of Exclusivity: Throughout the subsistence of this Agreement, CSC explicitly covenants that it shall not appoint, engage, onboard, or designate any competing software development firm, IT consultancy, freelance platform developer, or external technology partner to develop, manage, host, replicate, or co-brand CSC Circle's digital platform, core databases, or digital event check-in systems without the express prior written consent of LIT.`,
            `1.4 Statutory Enforceability under Indian Contract Act, Section 27: The parties mutually acknowledge that this exclusivity covenant is reasonable, strictly operational in scope, and necessary to preserve architectural integrity, cybersecurity continuity, and unified platform stability under Section 27 of the Indian Contract Act, 1872.`,
          ],
        },
        {
          heading: "2. Comprehensive Scope of Technical Services & Platform Architecture",
          clauses: [
            `2.1 Full-Stack Platform Engineering: LIT shall design, engineer, deploy, scale, and maintain the comprehensive CSC Circle web platform, including modern Next.js App Router frontends, server-side caching, relational Supabase PostgreSQL database schemas, and fine-grained Row-Level Security (RLS) enforcement.`,
            `2.2 Cryptographic Digital ID & Mobile Wallet Infrastructure: LIT shall architect and issue official CSC Circle Digital Membership ID Cards, incorporating secure dynamic QR codes, cryptographic SHA-256 signatures, Apple Wallet (.pkpass) distribution passes, Google Wallet integration, and offline-verifiable community credentials.`,
            `2.3 Event Ticketing, Check-In Scanners & Audit Logs: LIT shall build and oversee all event registration portals, attendee verification scanners, live on-ground check-in terminals, and automated attendance logging for all official CSC community summits, mixers, and masterclasses.`,
            `2.4 Automated Communications & Notification Pipelines: LIT shall configure, secure, and maintain omnichannel messaging pipelines, including transactional WhatsApp notifications, SMS OTP verification engines, automated welcome emails, and webhook-driven payment reconciliation.`,
          ],
        },
        {
          heading: "3. Service Level Agreement (SLA), Maintenance & Cybersecurity",
          clauses: [
            `3.1 Service Level Commitment: ${slaNote} LIT shall employ automated health probes, error tracking, and performance monitors to deliver an enterprise-grade experience for founders and ecosystem partners.`,
            `3.2 Scheduled Maintenance & Emergency Authority: Routine scheduled maintenance shall occur during off-peak hours with advance notice to CSC leadership. In the event of an active cyber threat, DDoS attack, critical vulnerability, or cloud provider degradation, LIT reserves the unilateral right to enable emergency maintenance mode to protect data integrity and server infrastructure.`,
            `3.3 Third-Party Cloud Sub-Processors: CSC expressly acknowledges that platform delivery relies upon trusted enterprise infrastructure providers, including Vercel, Supabase AWS, Upstash Redis, and Google Workspace/MSG91. LIT shall exercise professional care in vendor selection but shall not be held liable for upstream carrier outages, global DNS disruptions, or force majeure cloud incidents.`,
          ],
        },
        {
          heading: "4. Intellectual Property Rights (IPR), Background Codebase & Brand Licensing",
          clauses: [
            `4.1 Sole Ownership of LIT Background & Foreground IP: All source code, application architectures, database models, algorithms, UI component libraries, automation workflows, security implementations, and developer tooling authored or deployed by LIT remain the sole, absolute, and unencumbered intellectual property of Logic Intelligence Technologies.`,
            `4.2 Limited Operational License to CSC: LIT grants CSC a non-exclusive, non-transferable, revocable license to utilize the CSC Circle platform solely for legitimate community operations and member facilitation throughout the active term of this Agreement.`,
            `4.3 CSC Community Brand & Trademark Ownership: Coimbatore Startup Community retains sole ownership of its official trade name, circular logo, brand trade dress, community-created editorial articles, event photography, and founder directory assets. LIT claims no proprietary ownership over CSC's community brand identity.`,
          ],
        },
        {
          heading: "5. DPDP Act 2023 Compliance, Data Privacy & Strict Confidentiality",
          clauses: [
            `5.1 Statutory Roles under DPDP Act, 2023: For the statutory purposes of India's Digital Personal Data Protection Act, 2023 (DPDP Act), CSC operates as the Data Fiduciary and LIT operates as the designated Technical Data Processor tasked with processing member information strictly in accordance with approved community purposes.`,
            `5.2 Security Safeguards & Non-Exploitation Guarantee: LIT shall maintain industry-standard AES-256 data encryption at rest, TLS 1.3 transit encryption, restricted role-based administrative access, and tamper-resistant audit logs. Neither party shall sell, lease, rent, broker, or monetize member personal data to unauthorized third parties or marketing syndicates.`,
            `5.3 Perpetual Non-Disclosure of Confidential Information: Both parties solemnly covenant to maintain strict confidentiality regarding proprietary source code, database credentials, cryptographic keys, executive communications, financial statements, and founder pitch decks. This obligation survives in perpetuity beyond the termination or expiration of this Agreement.`,
          ],
        },
        {
          heading: "6. Commercial Consideration, Cloud Infrastructure Costs & Attribution",
          clauses: [
            `6.1 Strategic Pro-Bono Foundation & Development Contribution: Core software engineering, architecture, platform management, and ongoing software enhancements are contributed by LIT as an official ecosystem technology partner without recurring software licensing fees to CSC.`,
            `6.2 Direct Cloud Infrastructure Pass-Through: Dedicated third-party infrastructure fees, including domain registry renewals, high-volume WhatsApp/SMS API usage fees, specialized payment gateway charges, and extended cloud database tiers, shall be borne by CSC or invoiced at actual third-party vendor cost upon mutual agreement.`,
            `6.3 Official Platform Attribution: CSC shall conspicuously and permanently display "Official Technology Partner: Logic Intelligence Technologies (LIT)" across all digital platform footers, member verification pages, event ticket footers, and official website credits.`,
          ],
        },
        {
          heading: "7. Term, Orderly Transition, Dispute Resolution & Jurisdiction",
          clauses: [
            `7.1 Term & Perpetual Auto-Renewal: This Agreement shall remain in full force and effect on a perpetual, auto-renewing basis for ${duration}, subject to annual strategic alignment reviews by both parties.`,
            `7.2 Bilateral Termination & 90-Day Transition Window: Either party may terminate this Agreement by serving ninety (90) days' prior written notice to the other. Upon termination, LIT shall provide standard CSV/JSON database exports of CSC community member records to CSC leadership, while retaining all underlying codebase, frameworks, and intellectual property.`,
            `7.3 Dispute Resolution & Arbitration: Any dispute or claim arising out of or in connection with this Agreement shall be referred to and finally resolved by binding arbitration under the Arbitration and Conciliation Act, 1996. The seat and venue of arbitration shall be Coimbatore, Tamil Nadu, and proceedings shall be conducted in English by a sole arbitrator mutually appointed by the parties.`,
            `7.4 Governing Law: This Agreement is governed by and shall be construed in accordance with the substantive laws of India, with exclusive jurisdiction vested in the competent courts of Coimbatore, Tamil Nadu.`,
          ],
        },
      ];
      if (specialClauses) {
        sections.push({
          heading: "8. Additional Mutually Agreed Covenants",
          clauses: specialClauses.split(/\n+/).filter(Boolean),
        });
      }
      return sections;
    }

    case "leadership_charter": {
      const roleKey = input.leadershipRole || "ceo";
      const profile = LEADERSHIP_PROFILES[roleKey];
      const externalVenture = fd.externalVenture || profile.externalVenture;
      const customMandate = fd.mandateNotes?.trim();

      return [
        {
          heading: "1. Executive Appointment & Institutional Mandate",
          clauses: [
            `1.1 Formal Executive Appointment: This Executive Leadership Charter ("Charter") is formally executed on ${effective} by Coimbatore Startup Community ("CSC") to confirm the appointment of ${input.recipientName} ("Leader"), serving in the high office of ${input.recipientRole || profile.roleTitle}.`,
            `1.2 Core Operational Mandate: ${profile.mandateSummary}${customMandate ? ` ${customMandate}` : ""} The Leader accepts full responsibility for stewardship, continuous excellence, and dedicated execution of their designated functional portfolio.`,
            `1.3 Executive Council Authority & Consensus: Institutional partnerships, long-term legal agreements, external funding decisions, public policy representations, and operational expenditures exceeding standard discretionary limits require consensus alignment with the Founder and the CSC Executive Leadership Council.`,
          ],
        },
        {
          heading: "2. Fiduciary Duty, Ecosystem Ethics & Good Faith Stewardship",
          clauses: [
            `2.1 Duty of Utmost Good Faith: The Leader shall exercise the highest standard of loyalty, honesty, transparency, and care in all community engagements, prioritizing the collective growth of the Coimbatore startup ecosystem above personal interests.`,
            `2.2 Strict Prohibition against Commercial Exploitation: The Leader expressly covenants not to exploit CSC's member directories, internal WhatsApp groups, founder databases, attendee rosters, or executive privileges for unsolicited commercial solicitation, predatory customer prospecting, spam marketing, or personal financial gain.`,
            `2.3 Inclusive Community Standards & Zero Tolerance: The Leader shall uphold CSC's zero-tolerance policy against workplace harassment, gender or caste discrimination, defamation, or unethical conduct across both physical community summits and digital discussion boards.`,
          ],
        },
        {
          heading: "3. Conflict of Interest, External Ventures & Independent Business Disclosures",
          clauses: [
            `3.1 Formally Disclosed External Ventures: CSC formally recognizes and respects that the Leader actively operates, leads, or advises independent commercial ventures, specifically disclosed on official record as: ${externalVenture}.`,
            `3.2 Strict Arm's-Length Commercial Separation: Independent commercial ventures shall remain legally, financially, and operationally independent from Coimbatore Startup Community. Any commercial engagement, vendor contract, or co-sponsorship between CSC and an executive's venture must be conducted at arm's length, fully disclosed in writing, and approved by the Executive Council without self-dealing.`,
            `3.3 Recusal on Conflicted Matters: The Leader agrees to voluntarily recuse themselves from voting, steering deliberations, or executive decision-making whenever a direct operational or commercial conflict of interest arises.`,
          ],
        },
        {
          heading: "4. Intellectual Property, Community Assets & Brand Governance",
          clauses: [
            `4.1 Ownership of CSC Community Assets: All brand collateral, event slide decks, video reels, photographs, event structures, attendee archives, and community guidelines developed specifically under the Leader's CSC mandate remain the exclusive property of Coimbatore Startup Community (with the explicit exception of LIT's proprietary platform code and partners' pre-existing trademarks).`,
            `4.2 Brand Representation & Trademarks: The Leader is granted a limited, revocable right to represent CSC at official forums, conferences, and media channels, adhering strictly to CSC's approved visual identity guidelines, key messaging, and official brand positioning.`,
          ],
        },
        {
          heading: "5. Member Data Protection, Privacy & DPDP Act 2023 Compliance",
          clauses: [
            `5.1 Confidentiality of Community Personal Data: Administrative access granted to the Leader covering founder contact details, phone numbers, email directories, payment UTR verification logs, and private startup pitch records is strictly confidential.`,
            `5.2 Absolute Prohibition on Unauthorized Data Export: Exporting, backing up to personal cloud storage, sharing, or disseminating CSC community member data outside official CSC operational workflows is strictly prohibited and constitutes a material breach under the Digital Personal Data Protection Act, 2023 (DPDP Act).`,
            `5.3 Security Breach Notification: The Leader shall immediately report any suspected security compromise, unauthorized credential access, or data leakage affecting CSC member systems to the Chief Technology Officer (CTO) and the Executive Council.`,
          ],
        },
        {
          heading: "6. Operational Authority, Financial Discretion & Audit Integrity",
          clauses: [
            `6.1 Operational Budget Discretion: The Leader may commit pre-approved routine operational budgets required for event execution, venue coordination, guest speaker hospitality, and visual production, within thresholds authorized by the Executive Council.`,
            `6.2 Transparent Expense Reconciliation: All expenditures made on behalf of CSC must be evidenced by legitimate GST invoices, receipts, and verified bank/UPI transaction records submitted for community audit and ledger reconciliation.`,
          ],
        },
        {
          heading: "7. Active Tenure, Orderly Handover, Resignation & Jurisdiction",
          clauses: [
            `7.1 Term of Appointment: This Charter shall remain active and legally binding for ${duration} while the Leader holds office in Coimbatore Startup Community.`,
            `7.2 Resignation & Mandatory 30-Day Transition Handover: Either CSC or the Leader may conclude the leadership tenure by providing thirty (30) days' advance written notice. Upon resignation or transition, the Leader shall immediately complete a comprehensive handover, returning all administrative logins, digital assets, social media credentials, and community records.`,
            `7.3 Governing Law & Jurisdiction: This Charter is governed by the laws of India, with exclusive jurisdiction vested in the competent courts of Coimbatore, Tamil Nadu.`,
          ],
        },
      ];
    }

    case "strategic_mou": {
      const orgType = fd.orgType || "Ecosystem Partner / Academic Institution / Incubator";
      const scope =
        fd.collaborationScope ||
        "Joint founder meetups, student entrepreneurship bootcamps, startup incubation support, ecosystem knowledge transfer, and cross-promotional initiatives across Western Tamil Nadu.";
      const exclusivity = fd.exclusivity || "Non-Exclusive";

      return [
        {
          heading: "1. Institutional Recitals, Parties & Shared Ecosystem Vision",
          clauses: [
            `1.1 Formal Alliance: This Strategic Partnership Memorandum of Understanding ("MoU") is entered into on ${effective} by and between Coimbatore Startup Community ("CSC"), a premier collective supporting innovators across Western Tamil Nadu, and ${partnerName} ("Partner"), an esteemed ${orgType}, represented by its Authorized Signatory, ${input.recipientName} (${input.recipientRole || "Authorized Representative"}).`,
            `1.2 Shared Ecosystem Vision: Both parties unite with a common vision to accelerate regional entrepreneurship, foster grassroots startup innovation, nurture student founders, and create collaborative channels connecting academia, industry, and early-stage capital.`,
            `1.3 Agreed Scope of Strategic Collaboration: ${scope}`,
          ],
        },
        {
          heading: "2. Strategic Deliverables & Mutual Resource Commitments",
          clauses: [
            `2.1 CSC Operational Commitments: CSC shall facilitate access to seasoned startup founders, domain mentors, angel investors, and CTOs for guest lectures, demo days, and advisory sessions; provide event visibility on CSC Circle; and offer community membership pathways for emerging startups.`,
            `2.2 Partner Operational Commitments: Partner shall provide physical infrastructure (seminar auditoriums, innovation lab space, high-speed Wi-Fi), student volunteer support, academic credit coordination under NISP frameworks where applicable, and active promotion of CSC initiatives across its student and faculty network.`,
            `2.3 Joint Flagship Initiatives: The parties agree to explore co-hosting flagship campus hackathons, innovation challenge rounds, and founder roundtables throughout the active term.`,
          ],
        },
        {
          heading: "3. Legal Character: Binding vs. Non-Binding Intent",
          clauses: [
            `3.1 Non-Binding Collaborative Objectives: The programmatic goals, student attendance targets, and collaborative aspirations set forth in Section 1 and Section 2 express mutual goodwill and operational intent and do not constitute an enforceable financial debt, legal agency, or commercial joint venture under the Indian Partnership Act, 1932.`,
            `3.2 Binding Legal Covenants: The provisions of Section 4 (Intellectual Property & Brand Usage), Section 5 (Confidentiality & Non-Disclosure), Section 6 (DPDP Act Data Protection), Section 7 (Financial Disclaimers), and Section 8 (Term, Termination & Governing Law) are strictly binding and enforceable under the Indian Contract Act, 1872.`,
            `3.3 Exclusivity Classification: This strategic alliance is established on a ${exclusivity} basis. Neither party is prohibited from forging alliances with other incubators, colleges, or industry bodies.`,
          ],
        },
        {
          heading: "4. Intellectual Property, Trademarks & Co-Branding Protocols",
          clauses: [
            `4.1 Mutual Limited Trademark License: Each party grants the other a limited, non-exclusive, revocable, royalty-free license to display its official name and logo solely to announce, publicize, and promote mutually approved joint CSC × ${partnerName} initiatives.`,
            `4.2 Absolute Protection of Pre-Existing IP: Each party retains sole, absolute, and unencumbered ownership of its pre-existing intellectual property, curriculum, trade secrets, research patents, software systems, and trademarks. No intellectual property ownership is transferred under this MoU.`,
            `4.3 Press Releases & Public Announcements: Neither party shall publish formal press releases or make unilateral public statements regarding the other party's internal operations without prior email approval.`,
          ],
        },
        {
          heading: "5. Confidentiality, Non-Disclosure & Trade Secrets",
          clauses: [
            `5.1 Protection of Non-Public Information: Both parties agree to maintain strict confidentiality regarding non-public operational strategies, student startup pitch presentations, grant proposals, and internal communications shared during this alliance.`,
            `5.2 Three-Year Survival Obligation: Confidentiality covenants under this Section shall survive for a period of three (3) years following the termination or natural expiration of this MoU.`,
          ],
        },
        {
          heading: "6. Data Protection, Privacy & DPDP Act 2023 Compliance",
          clauses: [
            `6.1 Student & Member Privacy Safeguards: Both parties agree to strictly comply with India's Digital Personal Data Protection Act, 2023 (DPDP Act). Neither party shall scrape, harvest, rent, or distribute student or member rosters to third-party commercial marketing firms.`,
            `6.2 Explicit Opt-In for Shared Cohorts: Personal data of event attendees or student participants shall only be exchanged where the individual has given verifiable, explicit consent for event participation or certificate generation.`,
          ],
        },
        {
          heading: "7. Financial Disclaimers & Independent Liability",
          clauses: [
            `7.1 Zero Financial Liability Model: This MoU operates on a non-financial cooperative basis. Each party shall independently absorb its own overheads and administrative costs unless a separate, project-specific commercial contract is formally executed in writing.`,
            `7.2 Independent Contractors: The relationship between CSC and ${partnerName} is strictly that of independent entities. Neither party has the legal authority to bind, obligate, or represent the other in financial or legal matters.`,
          ],
        },
        {
          heading: "8. Term, Bilateral Review, Termination & Dispute Resolution",
          clauses: [
            `8.1 Active Term & Renewal: This MoU shall remain in effect for ${duration} from ${effective}, and may be renewed for successive annual periods by mutual written consent.`,
            `8.2 Termination for Convenience: Either party may terminate this MoU at any time by providing thirty (30) days' prior written notice to the other party, ensuring that any ongoing student sessions or scheduled workshops are completed in good faith.`,
            `8.3 Amicable Mediation & Governing Law: Any dispute arising out of this MoU shall be resolved through good-faith executive mediation between leadership representatives. This MoU is governed by the laws of India, with exclusive jurisdiction in the courts of Coimbatore, Tamil Nadu.`,
          ],
        },
      ];
    }

    case "event_collaboration": {
      const eventName = fd.eventName || "CSC Joint Innovation Summit & Ecosystem Meetup";
      const eventDate = fd.eventDate || effective;
      const venue = fd.eventVenue || "Coimbatore, Tamil Nadu";
      const cscResp =
        fd.cscResponsibilities ||
        "Publishing the official event page on CSC Circle, issuing cryptographically signed digital passes with dynamic QR codes, digital marketing across social media channels, speaker curation, agenda moderation, and deploying on-ground check-in scanners.";
      const partnerResp =
        fd.partnerResponsibilities ||
        "Providing dedicated venue space, audio/visual equipment (mics, projection screens, sound systems), high-speed Wi-Fi connectivity, uninterrupted backup power (UPS/DG), stage setup, and local security.";
      const financialTerms =
        fd.financialTerms ||
        "Zero-cost community collaboration model with no ticket revenue sharing unless separately agreed in an explicit commercial annexure.";

      return [
        {
          heading: "1. Event Particulars, Recitals & Co-Hosting Mandate",
          clauses: [
            `1.1 Binding Event Co-Hosting Pact: This Event Collaboration & Co-Hosting Agreement is entered into on ${effective} between Coimbatore Startup Community ("CSC") and ${partnerName} ("Co-Host"), represented by ${input.recipientName} (${input.recipientRole || "Authorized Event Coordinator"}).`,
            `1.2 Designated Event Particulars: Event Title: "${eventName}" | Scheduled Date & Time: ${eventDate} | Venue / Format: ${venue} | Target Audience: Startup founders, developers, innovators, and investors across Western Tamil Nadu.`,
            `1.3 Shared Objective: To co-produce an impactful, professional, and accessible community gathering that provides actionable entrepreneurial insights and high-value networking for attendees.`,
          ],
        },
        {
          heading: "2. Detailed Division of Operational & Logistics Responsibilities",
          clauses: [
            `2.1 CSC Responsibilities: ${cscResp}`,
            `2.2 Co-Host Responsibilities: ${partnerResp}`,
            `2.3 Equal Brand Representation on Collateral: Both parties agree to balanced, respectful co-branding across all digital banners, social media announcements, physical standees, backdrop flex prints, and digital passes.`,
          ],
        },
        {
          heading: "3. Ticketing Architecture, Financial Terms & Cost Reconciliation",
          clauses: [
            `3.1 Financial & Commercial Terms: ${financialTerms}`,
            `3.2 Transparent Financial Ledger: Where ticket sales or sponsor contributions are collected, the collecting party shall maintain an auditable ledger detailing gateway charges, GST payments, and operational disbursements, reconciling balances within seven (7) business days following event conclusion.`,
          ],
        },
        {
          heading: "4. Attendee Data Governance, Privacy & Cryptographic Verification",
          clauses: [
            `4.1 Master Registry & DPDP Act Compliance: All attendee registrations, UPI payment verifications, and cryptographic QR check-in logs processed via CSC Circle remain protected under the Digital Personal Data Protection Act, 2023.`,
            `4.2 Aggregate Metrics vs. Personal Data: CSC shall provide ${partnerName} with aggregate attendance demographics (attendance count, industry breakdown, founder percentage). Personal phone numbers and emails shall only be transferred if attendees have explicitly opted in during registration.`,
          ],
        },
        {
          heading: "5. Stage Etiquette, Code of Conduct & Anti-Harassment Standards",
          clauses: [
            `5.1 Code of Conduct Enforcement: Both parties agree to strictly enforce the CSC Community Code of Conduct. Harassment, derogatory speech, aggressive sales pitching, or deceptive multi-level marketing is strictly prohibited.`,
            `5.2 Safety & Ejection Authority: The organizing committee reserves the right to immediately eject any individual, speaker, or volunteer exhibiting disruptive or unlawful behavior at the event premises.`,
          ],
        },
        {
          heading: "6. Event Postponement, Cancellation, Force Majeure & Mutual Indemnity",
          clauses: [
            `6.1 Force Majeure & Good-Faith Rescheduling: Neither party shall be liable for failure to conduct the event due to extreme weather, natural disasters, municipal restrictions, or civic emergencies. In such event, both parties agree to reschedule within forty-five (45) days.`,
            `6.2 Mutual Property & Injury Indemnity: Each party shall be responsible for its own staff, contractors, and on-ground property, indemnifying the other against gross negligence or wilful misconduct occurring on the premises.`,
          ],
        },
        {
          heading: "7. Active Term, Electronic Execution & Governing Law",
          clauses: [
            `7.1 Term of Agreement: Valid for ${duration}, concluding upon final post-event audit wrap-up and reconciliation of event assets.`,
            `7.2 Electronic Execution under Section 10A of IT Act, 2000: Executed electronically under Section 10A of the Information Technology Act, 2000, governed by the laws of India, with exclusive jurisdiction in Coimbatore, Tamil Nadu.`,
          ],
        },
      ];
    }

    case "sponsorship": {
      const eventName = fd.eventName || "CSC Flagship Community Summit / Mixer";
      const tier = fd.sponsorshipTier || "Official Ecosystem Sponsor";
      const amount = fd.sponsorshipAmount || "INR 25,000 (Twenty-Five Thousand Indian Rupees) plus applicable taxes";
      const deliverables =
        fd.deliverables ||
        "Prominent logo placement on event stage backdrop, CSC Circle digital passes, official summit website, dedicated booth kiosk at the venue, curated panel speaking slot, and community post-event highlight across LinkedIn and Instagram.";
      const paymentTerms =
        fd.paymentTerms ||
        "100% advance payable via verified NEFT/RTGS/UPI prior to promotional launch, accompanied by valid transaction/UTR reference numbers.";

      return [
        {
          heading: "1. Parties, Event Designation & Sponsorship Appointment",
          clauses: [
            `1.1 Official Sponsorship Engagement: This Sponsorship & Brand Partner Agreement is executed on ${effective} by and between Coimbatore Startup Community ("CSC") and ${partnerName} ("Sponsor"), represented by ${input.recipientName} (${input.recipientRole || "Authorized Signatory"}).`,
            `1.2 Program & Sponsorship Category: CSC designates Sponsor as an official partner for "${eventName}", according Sponsor the formal title and benefits of: ${tier}.`,
            `1.3 Mutual Goodwill: Sponsor supports CSC's founder-first community mission, while CSC commits to maximizing Sponsor's brand visibility and ecosystem engagement.`,
          ],
        },
        {
          heading: "2. Commercial Consideration, Payment Milestones & Tax Compliance",
          clauses: [
            `2.1 Total Sponsorship Contribution: In consideration of the marketing rights granted herein, Sponsor agrees to contribute: ${amount}.`,
            `2.2 Payment Schedule & UTR Verification: ${paymentTerms} Sponsor must provide official bank transaction/UTR confirmation for audit compliance before promotional marketing commences.`,
            `2.3 GST & TDS Compliance: CSC shall issue a valid GST-compliant invoice where applicable. If Sponsor deducts Tax Deducted at Source (TDS) under the Income Tax Act, 1961, Sponsor shall provide Form 16A within statutory timelines.`,
          ],
        },
        {
          heading: "3. Comprehensive Brand Deliverables, Speaking Slots & Booth Privileges",
          clauses: [
            `3.1 Agreed Marketing & Brand Deliverables: ${deliverables}`,
            `3.2 Digital Pass & Banner Integration: Sponsor's high-resolution vector logo shall be prominently integrated into event landing pages, backdrop banners, badges, and CSC Circle digital event passes.`,
            `3.3 Dedicated Venue Booth & Delegate Passes: Sponsor is entitled to a physical booth space for product demonstrations and collaterals, along with complimentary VIP delegate passes for executive staff.`,
            `3.4 Post-Summit Digital Spotlight: Sponsor shall receive dedicated brand mentions in official event recap videos, photo archives, and post-summit newsletter distributions.`,
          ],
        },
        {
          heading: "4. Brand Asset Licensing, Marketing Guidelines & Creative Approval",
          clauses: [
            `4.1 Limited Trademark License: Sponsor grants CSC a non-exclusive, revocable license to utilize Sponsor's official name, trademarks, and uploaded logo strictly for event promotion.`,
            `4.2 Creative Material Approval: CSC shall submit major physical print proofs (backdrop banners, standees) to Sponsor for prompt creative review prior to final print fabrication.`,
          ],
        },
        {
          heading: "5. Sponsor Code of Conduct, Ethical Pitching & Pitch Restrictions",
          clauses: [
            `5.1 Ethical Brand Presentation: Sponsor covenants that its presentations, marketing literature, and booth demonstrations shall be truthful, professional, and aligned with ecosystem integrity.`,
            `5.2 Absolute Prohibition of Deceptive Schemes: Sponsor shall not promote high-risk speculative trading, deceptive financial return schemes, unregulated multi-level marketing, or engage in high-pressure aggressive pitching during event hours.`,
            `5.3 Attendee Privacy Respect: Booth representatives shall not harvest attendee personal details without explicit, voluntary attendee consent.`,
          ],
        },
        {
          heading: "6. Event Rescheduling, Organizer Cancellation & Refund Policies",
          clauses: [
            `6.1 Organizer Cancellation Refund: If CSC permanently cancels the sponsored event without rescheduling, all unutilized cash sponsorship fees shall be refunded to Sponsor within ten (10) business days.`,
            `6.2 Good-Faith Rescheduling: If the event is postponed due to weather, civic restrictions, or venue challenges, all sponsorship entitlements and branding deliverables shall seamlessly carry over to the rescheduled date.`,
            `6.3 Sponsor Forfeiture: Cancellations initiated unilaterally by Sponsor within fourteen (14) days of the scheduled event date shall be non-refundable, reflecting print and venue commitments incurred.`,
          ],
        },
        {
          heading: "7. Mutual Indemnification, Limitation of Liability & Confidentiality",
          clauses: [
            `7.1 Limitation of Liability: Under no circumstances shall either party's aggregate liability under this Agreement exceed the total sponsorship fee actually received by CSC.`,
            `7.2 Commercial Confidentiality: Both parties shall treat the financial consideration, negotiated discounts, and proprietary business discussions as strictly confidential.`,
          ],
        },
        {
          heading: "8. Active Term, Audit Compliance & Dispute Resolution",
          clauses: [
            `8.1 Term of Agreement: Valid for ${duration}, covering the pre-event marketing cycle through post-event wrap-up.`,
            `8.2 Dispute Resolution & Jurisdiction: Governed by the laws of India, with exclusive jurisdiction in the competent courts of Coimbatore, Tamil Nadu.`,
          ],
        },
      ];
    }

    case "speaker_mentor": {
      const sessionName = fd.sessionName || "CSC Founder Masterclass & Advisory Clinic";
      const sessionDate = fd.sessionDate || effective;
      const honorarium = fd.honorarium || "Pro-Bono Ecosystem Contribution / Give-First Mentorship";
      const mediaConsent =
        fd.mediaRelease ||
        "Comprehensive royalty-free license granted for video recording, photography, live broadcasting, and social media highlight reels.";

      return [
        {
          heading: "1. Engagement Details, Program Particulars & Session Scope",
          clauses: [
            `1.1 Expert Speaker / Mentor Engagement: This Speaker, Mentor & Advisor Agreement is entered into on ${effective} by and between Coimbatore Startup Community ("CSC") and ${input.recipientName} (${input.recipientRole || "Ecosystem Mentor & Industry Expert"}${input.recipientOrg ? `, ${input.recipientOrg}` : ""}).`,
            `1.2 Session Particulars & Format: Program Title: "${sessionName}" | Scheduled Date: ${sessionDate} | Format: Keynote address, interactive founder Q&A, and 1-on-1 startup mentorship clinic.`,
            `1.3 Honorarium & Contribution Model: ${honorarium}`,
          ],
        },
        {
          heading: "2. Non-Fiduciary Advisory Boundaries & Educational Guidance Disclaimer",
          clauses: [
            `2.1 Educational & Mentorship Purpose: Advice, feedback, critique, and insights shared by the Mentor are purely educational, inspirational, and directional. They do not constitute licensed legal, accounting, investment, or statutory advisory services.`,
            `2.2 Absence of Professional Liability: The Mentor bears no personal or commercial liability for the business outcomes, funding decisions, or operational pivots of founders receiving advice during CSC sessions.`,
            `2.3 Independent Expert Capacity: The Mentor participates in an independent capacity and does not act as an employee, partner, or legal agent of CSC.`,
          ],
        },
        {
          heading: "3. Founder Confidentiality, Pitch Protection & Non-Disclosure (NDA)",
          clauses: [
            `3.1 Protection of Sensitive Founder Information: During private clinics and pitch sessions, participating founders may disclose confidential product architectures, financial forecasts, cap tables, or proprietary trade secrets.`,
            `3.2 Strict Non-Exploitation Covenant: The Mentor covenants to treat all private startup disclosures in strict confidence and shall not copy, reverse-engineer, exploit, or disclose such information to competing ventures.`,
            `3.3 Two-Year Survival: This non-disclosure obligation survives for a period of two (2) years following the session date.`,
          ],
        },
        {
          heading: "4. Audio, Video, Photography & Media Release Covenants",
          clauses: [
            `4.1 Media Release Terms: ${mediaConsent}`,
            `4.2 Distribution Across CSC Channels: CSC is granted a perpetual, royalty-free, worldwide license to record, edit, photograph, and distribute public session highlights, keynote recordings, and social media reels across CSC Circle, YouTube, LinkedIn, and Instagram, with prominent credit to the Speaker.`,
          ],
        },
        {
          heading: "5. Speaker Intellectual Property Rights & Presentation Materials",
          clauses: [
            `5.1 Speaker IP Preservation: The Speaker retains 100% sole intellectual property ownership over their presentation slides, original methodologies, training materials, and personal frameworks.`,
            `5.2 Educational Distribution License: The Speaker grants CSC a limited license to distribute digital PDF copies of presentation slides to verified event attendees solely for educational use.`,
          ],
        },
        {
          heading: "6. Community Code of Conduct, Impartiality & Non-Solicitation",
          clauses: [
            `6.1 Professional Community Standards: The Speaker commits to upholding CSC's values of inclusivity, mutual respect, and constructive encouragement throughout the session.`,
            `6.2 Prohibition on Aggressive Commercial Solicitation: The Speaker shall not utilize CSC clinic sessions for aggressive self-promotion, predatory fee-charging, or unethical client poaching.`,
          ],
        },
        {
          heading: "7. Engagement Term, Survival Obligations & Governing Law",
          clauses: [
            `7.1 Term: This Agreement is effective for ${duration}, with confidentiality and media release provisions surviving session completion.`,
            `7.2 Governing Law & Jurisdiction: Governed by the laws of India, with exclusive jurisdiction vested in Coimbatore, Tamil Nadu.`,
          ],
        },
      ];
    }

    case "custom": {
      const provided = (input.customSections ?? []).filter(
        (s) => s.heading.trim() && s.clauses.some((c) => c.trim()),
      );
      if (provided.length > 0) {
        return [
          ...provided,
          {
            heading: `${provided.length + 1}. Data Privacy, Electronic Execution & Governing Law`,
            clauses: [
              `Both parties agree to comply with India's Digital Personal Data Protection Act, 2023 (DPDP Act) regarding any shared personal information.`,
              `This Agreement is executed electronically under Section 10A of the Information Technology Act, 2000 and is governed by the laws of India with exclusive jurisdiction in Coimbatore, Tamil Nadu.`,
            ],
          },
        ];
      }
      return [
        {
          heading: "1. Contracting Parties, Recitals & Core Objectives",
          clauses: [
            `1.1 Formal Legal Execution: This Community Cooperation Agreement ("Agreement") is formally executed on ${effective} by and between Coimbatore Startup Community ("CSC") and ${partnerName}, represented by its Authorized Signatory, ${input.recipientName} (${input.recipientRole || "Authorized Signatory"}).`,
            `1.2 Collaborative Objectives: The parties enter into this Agreement to execute bespoke community initiatives, joint ecosystem support frameworks, and specialized operational covenants in Coimbatore, Tamil Nadu.`,
            `1.3 Mutual Good Faith: Both parties agree to act transparently, professionally, and in good faith to achieve the shared goals of this collaboration.`,
          ],
        },
        {
          heading: "2. Operational Deliverables & Mutual Responsibilities",
          clauses: [
            `2.1 CSC Covenants & Deliverables: CSC shall provide agreed community platform visibility, member communication channels, digital pass infrastructure, and ecosystem coordination.`,
            `2.2 Partner Covenants & Deliverables: ${partnerName} shall deliver the specialized operational, logistical, or consultative contributions mutually agreed upon for this initiative.`,
            `2.3 Performance Standards: Both parties commit to timely communication and high professional quality in all collaborative deliverables.`,
          ],
        },
        {
          heading: "3. Intellectual Property, Trademarks & Brand Governance",
          clauses: [
            `3.1 Pre-Existing IP Preservation: Each party retains sole and unencumbered ownership of its pre-existing intellectual property, proprietary software, design systems, and trademarks.`,
            `3.2 Limited Cross-Promotional License: Each party grants the other a limited, revocable, non-exclusive license to use its logo and trade name solely for approved promotional materials related to this Agreement.`,
          ],
        },
        {
          heading: "4. Data Privacy, Non-Disclosure & DPDP Act 2023 Compliance",
          clauses: [
            `4.1 Confidentiality of Non-Public Information: Both parties agree to protect proprietary operational details, member databases, and commercial discussions with strict confidentiality for a minimum of two (2) years.`,
            `4.2 Compliance with DPDP Act, 2023: Both parties agree to adhere strictly to the Digital Personal Data Protection Act, 2023, ensuring zero unauthorized transfer, scraping, or commercial sale of personal member records.`,
          ],
        },
        {
          heading: "5. Term, Bilateral Notice & Orderly Handover",
          clauses: [
            `5.1 Active Duration: This Agreement remains in effect for ${duration} from ${effective}, renewable by mutual written consent.`,
            `5.2 Notice for Termination: Either party may conclude this Agreement by providing thirty (30) days' advance written notice, ensuring all ongoing deliverables are concluded equitably.`,
          ],
        },
        {
          heading: "6. Electronic Execution, Statutory Validity & Jurisdiction",
          clauses: [
            `6.1 Electronic Execution Validity: This Agreement is executed electronically and authenticated under Section 10A and Section 65B of the Information Technology Act, 2000 and the Indian Contract Act, 1872.`,
            `6.2 Governing Law: Governed by the laws of India, with exclusive jurisdiction vested in the competent courts of Coimbatore, Tamil Nadu.`,
          ],
        },
      ];
    }
  }
}
