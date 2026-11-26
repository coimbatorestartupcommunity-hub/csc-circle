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
        "Best-effort high availability with emergency maintenance authority and automated health monitoring.";
      const specialClauses = fd.specialClauses?.trim();

      const sections: AgreementSection[] = [
        {
          heading: "1. Parties & Exclusive Appointment",
          clauses: [
            `1.1 This Exclusive Technology Partner Agreement ("Agreement") is entered into as of ${effective} between Coimbatore Startup Community ("CSC"), a founder-focused startup community based in Coimbatore, Tamil Nadu, and Logic Intelligence Technologies ("LIT"), represented by ${input.recipientName} (${input.recipientRole || "Founder & CEO, LIT / CTO, CSC"}).`,
            `1.2 Sole & Exclusive Technology Partner: CSC hereby appoints Logic Intelligence Technologies (LIT) as the sole and exclusive Official Technology Partner of Coimbatore Startup Community for the CSC Circle digital platform (${domain}), member portal, Digital ID card infrastructure, event ticketing/QR systems, payment reconciliation, and automated community communications.`,
            `1.3 Exclusivity Covenant: During the subsistence of this Agreement, CSC shall not appoint, engage, onboard, or designate any competing third-party software agency, IT vendor, freelance platform developer, or external technology partner to build, host, replace, or co-brand CSC Circle's core digital platform or technical infrastructure without the prior written consent of LIT.`,
            `1.4 Statutory Balance (Indian Contract Act, Section 27): This exclusivity applies strictly during the active term of the partnership to protect technical architecture, security integrity, and unified platform operations.`,
          ],
        },
        {
          heading: "2. Scope of Technical Services & Infrastructure",
          clauses: [
            `2.1 LIT shall design, engineer, deploy, and maintain the CSC Circle web application, authentication flows, database schemas, Row-Level Security (RLS) policies, Digital Membership ID cards, Apple/Google Wallet pass generators, event check-in portals, and notification pipelines.`,
            `2.2 Service Level & Maintenance: ${slaNote} LIT reserves the right to enable emergency maintenance mode to protect platform security, data integrity, or third-party service continuity.`,
            `2.3 Third-Party Sub-Processors: CSC acknowledges that platform delivery utilizes cloud infrastructure providers including Vercel, Supabase, Upstash Redis, and Google Workspace/MSG91. LIT shall not be held liable for upstream outages, rate limits, or policy changes by such third-party infrastructure providers.`,
          ],
        },
        {
          heading: "3. Intellectual Property (IP) Ownership & Licensing",
          clauses: [
            `3.1 LIT Proprietary & Background IP: All source code, software architecture, UI/UX engineering systems, automation scripts, security modules, and proprietary tooling developed or deployed by LIT remain the sole and exclusive intellectual property of Logic Intelligence Technologies.`,
            `3.2 Operational License to CSC: LIT grants CSC a non-transferable, revocable operational license to use the CSC Circle platform solely for legitimate Coimbatore Startup Community activities during the term of this Agreement.`,
            `3.3 CSC Brand & Community Identity: Coimbatore Startup Community retains ownership of its community name, circular CSC logo, published editorial content, and community brand identity. LIT supports the platform and does not claim ownership over CSC's community identity.`,
          ],
        },
        {
          heading: "4. DPDP Act 2023 Data Processing & Confidentiality",
          clauses: [
            `4.1 Data Fiduciary & Processor Roles: For purposes of the Digital Personal Data Protection Act, 2023 (DPDP Act), CSC acts as the Data Fiduciary and LIT acts as the authorized Technical Data Processor operating the platform infrastructure.`,
            `4.2 Security & Non-Exploitation: LIT shall maintain industry-standard encryption, access controls, and audit logging. Neither party shall sell, rent, or transfer member personal data to unauthorized commercial brokers.`,
            `4.3 Perpetual Confidentiality: Both parties shall maintain strict confidentiality over proprietary source code, API keys, admin credentials, financial records, and member PII both during and after the term of this Agreement.`,
          ],
        },
        {
          heading: "5. Attribution, Term, Termination & Governing Law",
          clauses: [
            `5.1 Official Attribution: CSC Circle shall display "Technical Partner: Logic Intelligence Technologies (LIT)" attribution across the platform footer, member directories, and official digital communications.`,
            `5.2 Term & Transition: This Agreement remains in effect for ${duration} unless terminated by mutual written agreement with at least ninety (90) days' prior written notice. Upon termination, LIT shall provide reasonable data-export assistance for CSC community member records while retaining full ownership of LIT's proprietary codebase and infrastructure.`,
            `5.3 Governing Law & Jurisdiction: This Agreement is governed by the laws of India, with exclusive jurisdiction vested in the competent courts of Coimbatore, Tamil Nadu.`,
          ],
        },
      ];
      if (specialClauses) {
        sections.push({
          heading: "6. Additional Agreed Terms",
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
          heading: "1. Appointment & Executive Mandate",
          clauses: [
            `1.1 This Executive Leadership Charter ("Charter") is executed on ${effective} between Coimbatore Startup Community ("CSC") and ${input.recipientName} ("Leader"), serving in the capacity of ${input.recipientRole || profile.roleTitle}.`,
            `1.2 Core Mandate: ${profile.mandateSummary}${customMandate ? ` ${customMandate}` : ""}`,
            `1.3 Authority Boundaries: Major institutional partnerships, public policy announcements, and financial commitments outside routine operational budgets require alignment with the Founder and relevant Executive Leads.`,
          ],
        },
        {
          heading: "2. Fiduciary Duty & Community Ethics",
          clauses: [
            `2.1 Duty of Good Faith: The Leader shall act honestly, transparently, and in the best interest of the Coimbatore Startup Community ecosystem at all times.`,
            `2.2 Non-Exploitation of Community Access: The Leader shall not misuse CSC's member directory, WhatsApp groups, admin dashboards, or founder data for unsolicited commercial pitching, spam, or unauthorized personal gain.`,
            `2.3 Inclusivity & Respect: The Leader commits to upholding CSC's zero-tolerance standards against harassment, discrimination, or unethical conduct at both physical meetups and digital forums.`,
          ],
        },
        {
          heading: "3. Conflict of Interest & Independent Ventures",
          clauses: [
            `3.1 Disclosed External Affiliation: CSC formally acknowledges that the Leader may operate or lead independent external ventures, specifically disclosed as: ${externalVenture}.`,
            `3.2 Separation of Entities: Independent commercial ventures remain legally and financially separate from CSC. Any paid collaboration, sponsorship, or commercial service between CSC and a Leader's external venture must be transparently disclosed and approved without self-dealing.`,
          ],
        },
        {
          heading: "4. Intellectual Property & Confidentiality",
          clauses: [
            `4.1 CSC Brand & Assets: All CSC-branded designs, event formats, official social media content, and community documentation created specifically under the Leader's CSC mandate belong to Coimbatore Startup Community (except pre-existing partner IP or LIT's proprietary platform codebase).`,
            `4.2 Strict Data Confidentiality (DPDP Act 2023): Admin access to member phone numbers, emails, UPI payment UTRs, and verification records is strictly confidential. Exporting or sharing member PII outside authorized CSC workflows is prohibited.`,
          ],
        },
        {
          heading: "5. Tenure, Resignation, Handover & Jurisdiction",
          clauses: [
            `5.1 Tenure: This Charter remains active for ${duration} while the Leader holds an executive leadership position at CSC.`,
            `5.2 Resignation & 30-Day Handover: Either party may conclude the leadership tenure with thirty (30) days' written notice. Upon exit or revocation, the Leader must immediately return or transfer all CSC administrative credentials, social accounts, media files, and community assets.`,
            `5.3 Governing Law: Governed by the laws of India, with exclusive jurisdiction in Coimbatore, Tamil Nadu.`,
          ],
        },
      ];
    }

    case "strategic_mou": {
      const orgType = fd.orgType || "Ecosystem Partner";
      const scope =
        fd.collaborationScope ||
        "Joint founder meetups, ecosystem knowledge sharing, startup referrals, and community cross-promotion in Coimbatore.";
      const exclusivity = fd.exclusivity || "Non-Exclusive";

      return [
        {
          heading: "1. Parties & Purpose of Alliance",
          clauses: [
            `1.1 This Memorandum of Understanding ("MoU") is entered into on ${effective} between Coimbatore Startup Community ("CSC") and ${partnerName} (${orgType}), represented by ${input.recipientName} (${input.recipientRole || "Authorized Representative"}).`,
            `1.2 Shared Vision: Both parties wish to collaborate to strengthen startup innovation, founder mentorship, and entrepreneurial networking across Coimbatore and Tamil Nadu.`,
            `1.3 Scope of Collaboration: ${scope}`,
          ],
        },
        {
          heading: "2. Binding vs. Non-Binding Nature",
          clauses: [
            `2.1 Non-Binding Operational Intent: High-level collaboration goals, mutual referrals, and best-effort event participation outlined in Section 1 represent good-faith intent and do not create an employment, agency, or legal joint-venture entity.`,
            `2.2 Binding Covenants: Sections 3 (Brand & IP), 4 (Confidentiality & DPDP Data Protection), and 5 (Term, Termination & Jurisdiction) are legally binding and enforceable under the Indian Contract Act, 1872.`,
            `2.3 Exclusivity Status: This alliance is ${exclusivity}. Neither party is restricted from partnering with other ecosystem organizations unless expressly agreed in writing.`,
          ],
        },
        {
          heading: "3. Brand Usage & Intellectual Property",
          clauses: [
            `3.1 Limited Logo License: Each party grants the other a limited, revocable right to display its official name and logo solely to announce or promote approved joint CSC × ${partnerName} initiatives.`,
            `3.2 Pre-Existing IP: Each party retains sole ownership of its trademarks, logos, curriculum, and proprietary materials. No IP ownership is transferred under this MoU.`,
          ],
        },
        {
          heading: "4. Confidentiality & DPDP Act 2023 Compliance",
          clauses: [
            `4.1 Non-Disclosure: Both parties shall keep non-public operational plans, financial figures, and partner communications strictly confidential for a period of three (3) years from disclosure.`,
            `4.2 Member Data Protection: Neither party may scrape, export, sell, or send unsolicited promotional messages to CSC community members or partner cohorts without explicit user consent compliant with India's Digital Personal Data Protection Act, 2023.`,
          ],
        },
        {
          heading: "5. Term, Termination & Governing Law",
          clauses: [
            `5.1 Term: This MoU is effective from ${effective} for a duration of ${duration}, renewable by mutual written consent.`,
            `5.2 Termination: Either party may terminate this MoU for convenience by providing thirty (30) days' written notice, or immediately upon material breach of Confidentiality or Brand guidelines.`,
            `5.3 Governing Law: Governed by the laws of India. Courts in Coimbatore, Tamil Nadu shall have exclusive jurisdiction.`,
          ],
        },
      ];
    }

    case "event_collaboration": {
      const eventName = fd.eventName || "CSC Joint Ecosystem Meetup";
      const eventDate = fd.eventDate || effective;
      const venue = fd.eventVenue || "Coimbatore, Tamil Nadu";
      const cscResp =
        fd.cscResponsibilities ||
        "Event promotion on CSC Circle, online registration & cryptographic QR pass issuance, check-in portal, and community outreach.";
      const partnerResp =
        fd.partnerResponsibilities ||
        "Venue/infrastructure support, local coordination, and agreed co-hosting deliverables.";
      const financialTerms =
        fd.financialTerms || "Zero-cost / in-kind collaboration with no revenue sharing unless separately invoiced.";

      return [
        {
          heading: "1. Event Details & Co-Hosting Parties",
          clauses: [
            `1.1 This Event Collaboration & Co-Hosting Agreement is made on ${effective} between Coimbatore Startup Community ("CSC") and ${partnerName}, represented by ${input.recipientName} (${input.recipientRole || "Coordinator"}).`,
            `1.2 Event Particulars: Event Title: "${eventName}" | Scheduled Date: ${eventDate} | Venue / Format: ${venue}.`,
          ],
        },
        {
          heading: "2. Division of Operational Responsibilities",
          clauses: [
            `2.1 CSC Responsibilities: ${cscResp}`,
            `2.2 Partner Responsibilities: ${partnerResp}`,
            `2.3 Brand Co-Presentation: Both parties agree to clear, respectful co-branding on digital banners, event passes, and stage acknowledgments.`,
          ],
        },
        {
          heading: "3. Financial Terms & Attendee Data Governance",
          clauses: [
            `3.1 Financial & Ticketing Terms: ${financialTerms}`,
            `3.2 Attendee Data Ownership (DPDP Act 2023): Registration records, UPI payment verifications, and QR check-in logs remain under CSC's platform governance. Aggregate attendance counts may be shared with ${partnerName}; personal contact details shall only be shared where attendees explicitly opt in.`,
          ],
        },
        {
          heading: "4. Cancellation, Force Majeure & Liability",
          clauses: [
            `4.1 Rescheduling & Force Majeure: If the event is postponed due to weather, public health advisories, venue unavailability, or force majeure, both parties shall coordinate in good faith to reschedule or notify registered attendees.`,
            `4.2 Limitation of Liability & Conduct: Each party is responsible for its own staff, speakers, and on-ground property. Attendees are governed by CSC's Community & Event Code of Conduct.`,
          ],
        },
        {
          heading: "5. Governing Law & Execution",
          clauses: [
            `5.1 Term: Effective through completion of "${eventName}" and post-event wrap-up (${duration}).`,
            `5.2 Jurisdiction: Governed by the laws of India with exclusive jurisdiction in Coimbatore, Tamil Nadu.`,
          ],
        },
      ];
    }

    case "sponsorship": {
      const eventName = fd.eventName || "CSC Community Program / Meetup";
      const tier = fd.sponsorshipTier || "Official Event Sponsor";
      const amount = fd.sponsorshipAmount || "As agreed in sponsorship schedule (INR / In-Kind)";
      const deliverables =
        fd.deliverables ||
        "Brand logo placement on event banner & digital passes, stage acknowledgment, and community post-event highlight.";
      const paymentTerms =
        fd.paymentTerms || "100% payable via verified UPI / bank transfer prior to event announcement.";

      return [
        {
          heading: "1. Sponsorship Appointment & Program",
          clauses: [
            `1.1 This Sponsorship & Brand Partner Agreement is executed on ${effective} between Coimbatore Startup Community ("CSC") and ${partnerName} ("Sponsor"), represented by ${input.recipientName} (${input.recipientRole || "Authorized Signatory"}).`,
            `1.2 Program & Tier: "${eventName}" — Sponsorship Tier: ${tier}.`,
          ],
        },
        {
          heading: "2. Sponsorship Consideration & Payment Terms",
          clauses: [
            `2.1 Sponsorship Contribution: ${amount}.`,
            `2.2 Payment & Reconciliation: ${paymentTerms} All financial transfers must include valid transaction/UTR references for CSC audit compliance.`,
          ],
        },
        {
          heading: "3. Brand Deliverables & Conduct Restrictions",
          clauses: [
            `3.1 CSC Deliverables: ${deliverables}`,
            `3.2 No Unsolicited Financial Solicitation: Sponsor agrees not to use CSC stages or attendee access for misleading investment schemes, guaranteed-return claims, or unauthorized aggressive cold-calling.`,
            `3.3 Brand Assets: Sponsor grants CSC a limited license to display Sponsor's uploaded logo and approved brand copy across event materials.`,
          ],
        },
        {
          heading: "4. Cancellation, Refunds & Liability",
          clauses: [
            `4.1 Organizer Cancellation: If CSC cancels the sponsored event entirely without rescheduling, any unutilized cash sponsorship fee shall be refunded within 7–10 business days.`,
            `4.2 Sponsor Withdrawal: Cancellations by Sponsor within 7 days of the event date are non-refundable once promotional deliverables have commenced.`,
          ],
        },
        {
          heading: "5. Governing Law & Jurisdiction",
          clauses: [
            `5.1 Term: Valid for ${duration} covering the sponsored program lifecycle.`,
            `5.2 Jurisdiction: Governed by the laws of India, with exclusive jurisdiction in Coimbatore, Tamil Nadu.`,
          ],
        },
      ];
    }

    case "speaker_mentor": {
      const sessionName = fd.sessionName || "CSC Founder Session / Advisory Clinic";
      const sessionDate = fd.sessionDate || effective;
      const honorarium = fd.honorarium || "Pro-Bono Community Contribution";
      const mediaConsent = fd.mediaRelease || "Full video, audio, photography & social reel release granted";

      return [
        {
          heading: "1. Engagement as Speaker / Mentor / Advisor",
          clauses: [
            `1.1 This Speaker, Mentor & Advisor Agreement is entered into on ${effective} between Coimbatore Startup Community ("CSC") and ${input.recipientName} (${input.recipientRole || "Ecosystem Mentor"}${input.recipientOrg ? `, ${input.recipientOrg}` : ""}).`,
            `1.2 Session / Program: "${sessionName}" (Scheduled: ${sessionDate}). Honorarium / Fee Terms: ${honorarium}.`,
          ],
        },
        {
          heading: "2. Non-Fiduciary Advisory Boundaries",
          clauses: [
            `2.1 Educational & Ecosystem Guidance: Advice, feedback, or mentorship shared with founders is educational and informational only. It does not constitute regulated financial, legal, tax, or investment advice, nor does it create a formal fiduciary or equity relationship unless separately contracted.`,
            `2.2 Independence: The Speaker/Mentor participates as an independent ecosystem contributor and not as an employee or legal agent of CSC.`,
          ],
        },
        {
          heading: "3. Founder Pitch Confidentiality (NDA)",
          clauses: [
            `3.1 Protection of Startup Ideas: During 1-on-1 clinics, demo days, or private mentor sessions, founders may share sensitive product roadmaps, financials, or unpublished ideas. The Mentor agrees to treat such private disclosures confidentially and not to copy, exploit, or disclose them to competitors.`,
          ],
        },
        {
          heading: "4. Media, Recording & Content Release",
          clauses: [
            `4.1 Media Release Terms: ${mediaConsent}.`,
            `4.2 Attribution: CSC may record, photograph, edit, and publish clips, reels, and educational highlights from public sessions across CSC Circle, Instagram, LinkedIn, and YouTube with due credit to the Speaker/Mentor.`,
          ],
        },
        {
          heading: "5. Term & Governing Law",
          clauses: [
            `5.1 Term: Effective for ${duration}; confidentiality obligations survive for two (2) years following the session.`,
            `5.2 Jurisdiction: Governed by the laws of India, with exclusive jurisdiction in Coimbatore, Tamil Nadu.`,
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
          heading: "1. Parties, Purpose & Duration",
          clauses: [
            `1.1 This Agreement is entered into on ${effective} between Coimbatore Startup Community ("CSC") and ${partnerName}, represented by ${input.recipientName} (${input.recipientRole || "Authorized Signatory"}).`,
            `1.2 Duration: Effective for ${duration} from the date of execution.`,
          ],
        },
        {
          heading: "2. Mutual Covenants & Confidentiality",
          clauses: [
            `2.1 Both parties agree to collaborate in good faith and maintain confidentiality of non-public community, technical, and member data in compliance with the DPDP Act, 2023.`,
            `2.2 Governing Law: Governed by the laws of India, with exclusive jurisdiction in Coimbatore, Tamil Nadu.`,
          ],
        },
      ];
    }
  }
}
