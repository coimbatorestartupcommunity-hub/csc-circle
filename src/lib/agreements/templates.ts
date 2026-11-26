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
      "Role-specific mandate, fiduciary duty, conflict-of-interest disclosure, and handover charter for each of CSC's 7 Core Leaders.",
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
      "Ecosystem, college, incubator, or brand Memorandum of Understanding with NDA, brand rules, security, and DPDP compliance.",
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
      "Joint meetup, hackathon, or workshop agreement defining venue, ticketing, data ownership, safety, and liability.",
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
      "Cash or in-kind sponsorship contract covering deliverables, UTR reconciliation, refunds, privacy, and pitch rules.",
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
      "Non-fiduciary advisory charter with founder pitch confidentiality (NDA), media release, and code of conduct.",
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
    roleTitle: "Founder & President, Coimbatore Startup Community",
    defaultName: "K. N. Reyash",
    externalVenture: "Belvoria (Founder) & Independent Startup Developer",
    mandateSummary:
      "Provides overall community vision, strategic direction, final approval of community initiatives, founder network stewardship, and institutional representation of CSC.",
  },
  co_founder: {
    key: "co_founder",
    roleTitle: "Co-Founder & Vice President, Coimbatore Startup Community",
    defaultName: "E. R. Sharan",
    externalVenture: "CECIL Groups of Companies & Industries (Founder)",
    mandateSummary:
      "Provides co-founding strategic leadership, high-level corporate connections, institutional partnerships, and ecosystem expansion across Coimbatore and Tamil Nadu.",
  },
  ceo: {
    key: "ceo",
    roleTitle: "Chief Executive Officer (CEO), Coimbatore Startup Community",
    defaultName: "Mirra Mahendran",
    externalVenture: "Independent Executive Leadership & Strategic Consulting",
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

function buildIndividualizedLeadershipCharter(
  roleKey: LeadershipRoleKey,
  input: BuildAgreementInput,
  effective: string,
  duration: string,
): AgreementSection[] {
  const profile = LEADERSHIP_PROFILES[roleKey];
  const leaderName = input.recipientName || profile.defaultName;
  const leaderRole = input.recipientRole || profile.roleTitle;
  const externalVenture = input.formData?.externalVenture || profile.externalVenture;
  const customMandate = input.formData?.mandateNotes?.trim();

  switch (roleKey) {
    case "founder":
      return [
        {
          heading: "1. Presidential Office, Constitutional Mandate & Ecosystem Stewardship",
          clauses: [
            `1.1 Formal Presidential Appointment: This Executive Leadership Charter ("Charter") is executed on ${effective} by Coimbatore Startup Community ("CSC"), confirming the supreme executive stewardship of ${leaderName} ("Leader"), serving in the constitutional office of ${leaderRole}.`,
            `1.2 Custodian of Founding Vision: The Leader stands as the principal custodian and ethical guardian of CSC's foundational ethos: fostering a peer-to-peer, non-transactional ecosystem where founders in Western Tamil Nadu can access high-caliber mentorship, capital, and technology without predatory barriers.${customMandate ? ` ${customMandate}` : ""}`,
            `1.3 Presidential Veto & Final Ratification Authority: All institutional alliances, bilateral MoUs with governmental bodies, financial commitments exceeding discretionary limits, bylaw revisions, and appointments to the Executive Council require explicit written ratification by the Founder & President.`,
          ],
        },
        {
          heading: "2. Diplomatic Representation, StartupTN / MSME Liaison & Ecosystem Advocacy",
          clauses: [
            `2.1 Sovereign Ecosystem Voice: The Leader serves as the chief ambassador and primary diplomatic representative of CSC before federal and state innovation bodies, including StartupTN, the Ministry of MSME, DPIIT, TiE Global, and prominent venture capital networks.`,
            `2.2 Keynote Advocacy & Thought Leadership: Leading public ecosystem advocacy on behalf of regional founders, delivering presidential addresses at flagship summits, and authoring thought leadership perspectives that articulate Coimbatore's emerging status as a national tier-2 innovation hub.`,
            `2.3 Advisory Board & Patron Inductions: Holding the exclusive authority to nominate, evaluate, and formally induct veteran industrialists, exited entrepreneurs, and institutional patrons into the CSC Advisory Council.`,
          ],
        },
        {
          heading: "3. Fiduciary Duty, Ecosystem Ethics & Good Faith Stewardship",
          clauses: [
            `3.1 Highest Standard of Fiduciary Care: The Leader shall exercise exemplary loyalty, transparency, prudence, and good faith, perpetually prioritizing the long-term collective welfare and sustainability of the Coimbatore startup collective above any individual or commercial advantage.`,
            `3.2 Strict Prohibition against Commercial Exploitation: Absolute covenant ensuring that CSC's confidential member directories, private founder forums, WhatsApp channels, and VIP networks are never exploited for personal consulting solicitation, customer prospecting, or commercial marketing syndicates.`,
            `3.3 Zero Tolerance for Harassment & Bias: Enforcing an uncompromising zero-tolerance code across both physical events and digital forums regarding discrimination, harassment, unethical gatekeeping, or defamatory conduct.`,
          ],
        },
        {
          heading: "4. Conflict of Interest Governance, Belvoria & Startup Builder Safeguards",
          clauses: [
            `4.1 Formally Disclosed External Venture: CSC formally recognizes and records that the Leader actively operates and architects independent technology and product initiatives, specifically recorded as: ${externalVenture}.`,
            `4.2 Strict Legal & Commercial Separation: Independent software ventures, including Belvoria, remain legally, financially, and operationally independent from Coimbatore Startup Community.`,
            `4.3 Arm's-Length Commercial Standards: Any future commercial transaction, software licensing agreement, or pilot program between CSC and the Leader's independent ventures must be documented in writing, subjected to fair market valuation, and approved unanimously by disinterested members of the Executive Council.`,
          ],
        },
        {
          heading: "5. Community Constitutional Property, Circular Trademark & Domain Stewardship",
          clauses: [
            `5.1 Trust Ownership of Community Property: The official name "Coimbatore Startup Community", the "CSC Circle" branding, circular emblems, website domains (including csc.logicintelligencetechnologies.in), editorial publications, and community archives are held in trust under presidential stewardship for the collective benefit of the community.`,
            `5.2 Protection against Brand Dilution: The Leader is charged with defending CSC's visual trademarks and intellectual property against unauthorized commercial licensing, trademark squatting, or predatory dilution by third-party entities.`,
          ],
        },
        {
          heading: "6. Data Governance, Founder Pitch Confidentiality & DPDP Act 2023 Compliance",
          clauses: [
            `6.1 Presidential Data Governance: Ensuring that all administrative organs, event systems, and digital portals of CSC adhere strictly to India's Digital Personal Data Protection Act, 2023 (DPDP Act).`,
            `6.2 Confidentiality of Founder Intellectual Property: Guaranteeing that private startup pitch decks, cap tables, early prototypes, and investor discussions shared within CSC pitch clinics remain privileged and protected from unauthorized external dissemination.`,
            `6.3 Prohibition of Commercial Data Brokering: Affirming that personal member records, phone numbers, and transactional records shall never be rented, monetized, sold, or shared with commercial advertising brokers.`,
          ],
        },
        {
          heading: "7. Discretionary Authority, Financial Oversight & Audit Integrity",
          clauses: [
            `7.1 Presidential Discretionary Limit: Authority to approve operational budgets and emergency disbursements necessary for flagship summit production, distinguished guest hospitality, and legal compliance.`,
            `7.2 Audit Integrity & Ledger Oversight: Ensuring that all financial receipts, bank transactions, and UPI UTR records are audited annually by independent qualified professionals and made transparent to the Executive Council.`,
          ],
        },
        {
          heading: "8. Presidential Succession, Orderly 60-Day Constitutional Handover & Jurisdiction",
          clauses: [
            `8.1 Active Presidential Tenure: This Charter remains active and binding for ${duration} throughout the Leader's active stewardship as Founder & President.`,
            `8.2 Orderly 60-Day Succession Protocol: In the event of voluntary transition or retirement, the Leader shall provide sixty (60) days' advance written notice, chairing an orderly transition committee and executing complete handover of domain registrar accounts, social media admin rights, and community bank signatories.`,
            `8.3 Governing Law & Arbitration: Governed by the substantive laws of India, with binding arbitration in Coimbatore, Tamil Nadu under the Arbitration and Conciliation Act, 1996.`,
          ],
        },
      ];

    case "co_founder":
      return [
        {
          heading: "1. Co-Founding Mandate, Vice Presidency & Industrial Ecosystem Expansion",
          clauses: [
            `1.1 Co-Founder & Vice President Appointment: This Charter is executed on ${effective} by Coimbatore Startup Community ("CSC"), confirming the executive stewardship of ${leaderName} ("Leader"), serving in the high office of ${leaderRole}.`,
            `1.2 Corporate & Industrial Growth Mandate: Driving strategic corporate alliances, high-level industrial partnerships, industry-academia linkages, and regional chapter growth across Coimbatore and Western Tamil Nadu.${customMandate ? ` ${customMandate}` : ""}`,
            `1.3 Executive Deputation & Presidential Partnership: Serving as co-executive lead, presiding over Executive Council sessions in the President's absence, and holding co-signing authority on major institutional MoUs and corporate sponsorships.`,
          ],
        },
        {
          heading: "2. Corporate Governance, Industrial Linkages & Industry-Academia Synergies",
          clauses: [
            `2.1 Enterprise-Grade Governance: Infusing institutional discipline, corporate governance, and structured operational planning into CSC's non-profit ecosystem programs.`,
            `2.2 Industry Linkage Programs: Connecting emerging technology founders with established industrial leaders in automotive, textile, foundry, precision engineering, and manufacturing across Coimbatore.`,
            `2.3 Non-Exploitation of Community Trust: Absolute covenant not to utilize CSC internal founder networks for predatory corporate recruitment, unapproved industrial lobbying, or unsolicited commercial prospecting.`,
          ],
        },
        {
          heading: "3. Conflict of Interest Governance, CECIL Groups & Industrial Holdings",
          clauses: [
            `3.1 Formally Disclosed External Venture: CSC formally recognizes that the Leader operates and leads independent industrial enterprises, specifically recorded as: ${externalVenture}.`,
            `3.2 Strict Enterprise Separation: Complete legal, financial, and accounting separation between CECIL Groups corporate operations and CSC non-profit activities.`,
            `3.3 Mandatory Recusal on Conflicted Matters: Voluntary recusal from any procurement, vendor selection, or sponsorship deliberations where CECIL Groups or its subsidiaries are prospective bidders or sponsors.`,
          ],
        },
        {
          heading: "4. Institutional Outreach, Industry MoUs & Brand Rights",
          clauses: [
            `4.1 High-Level Industry Representation: Leading strategic outreach and representing CSC before premier industrial chambers (CODISSIA, CII, TiE Coimbatore, and Indian Chamber of Commerce).`,
            `4.2 Academic Alliances: Co-leading partnership MoUs with premier engineering universities and research parks to bridge academic research with commercial startup ventures.`,
          ],
        },
        {
          heading: "5. Data Protection, Industrial Privacy & DPDP Act 2023 Compliance",
          clauses: [
            `5.1 Protection of Industrial & Founder Secrets: Maintaining strict confidentiality regarding proprietary enterprise technologies, patent disclosures, and startup cap tables accessed through CSC forums.`,
            `5.2 Compliance with DPDP Act, 2023: Ensuring all corporate partnership attendee lists and industrial delegacies comply strictly with the Digital Personal Data Protection Act, 2023.`,
          ],
        },
        {
          heading: "6. Institutional Budgeting, Sponsorship Facilitation & Fiscal Governance",
          clauses: [
            `6.1 Strategic Sponsorship Facilitation: Guiding the curation and onboarding of enterprise sponsors, ensuring high-value deliverables without compromising community independence.`,
            `6.2 Fiscal Integrity: Ensuring all corporate contributions and grants received are accounted for with GST-compliant documentation and verified bank transaction references.`,
          ],
        },
        {
          heading: "7. General Terms, Indemnification & Limitation of Liability",
          clauses: [
            `7.1 Mutual Warranties & Authority: The Leader represents having full legal capacity to enter into and execute this Charter.`,
            `7.2 Limitation of Personal Liability: The Leader bears no personal financial liability for bona fide community initiatives executed in good faith under council authorization.`,
          ],
        },
        {
          heading: "8. Active Tenure, Co-Leadership Continuity, 30-Day Transition Handover & Jurisdiction",
          clauses: [
            `8.1 Active Tenure: Binding for ${duration} during active leadership as Co-Founder & Vice President.`,
            `8.2 30-Day Transition Handover: Either party may conclude active operational duties with thirty (30) days' written notice, requiring full handover of ongoing corporate alliance dossiers and partner contacts.`,
            `8.3 Governing Law: Governed by the laws of India with exclusive jurisdiction in Coimbatore, Tamil Nadu.`,
          ],
        },
      ];

    case "ceo":
      return [
        {
          heading: "1. Chief Executive Officer Appointment & Operational Delivery Mandate",
          clauses: [
            `1.1 Chief Executive Appointment: This Charter is executed on ${effective} by Coimbatore Startup Community ("CSC"), confirming the executive appointment of ${leaderName} ("Leader"), serving in the high office of ${leaderRole}.`,
            `1.2 Operational Delivery Mandate: Spearheading the day-to-day execution, operational cadence, cross-functional team coordination, task follow-ups, and milestone delivery of CSC programs following Founder alignment.${customMandate ? ` ${customMandate}` : ""}`,
            `1.3 Cross-Functional Executive Steering: Aligning engineering, operations, brand, community, and partnerships into a cohesive, synchronized execution roadmap.`,
          ],
        },
        {
          heading: "2. Cross-Functional Execution Cadence, Team Alignment & Milestone Accountability",
          clauses: [
            `2.1 Program Management Cadence: Running bi-weekly operational sprint reviews, establishing accountable deadlines, and unblocking functional leads across all initiatives.`,
            `2.2 Volunteer & Lead Mentorship: Cultivating high morale, professional discipline, and transparent communication across all operational teams.`,
            `2.3 Monthly Executive Reviews: Preparing and delivering comprehensive operational status reports, KPI dashboards, and program recaps to the Founder and Executive Council.`,
          ],
        },
        {
          heading: "3. Fiduciary Duty, Operational Transparency & Team Stewardship",
          clauses: [
            `3.1 Duty of Utmost Good Faith: Exercising the highest standard of loyalty, honesty, and operational transparency across all community engagements.`,
            `3.2 Non-Exploitation Covenant: Guaranteeing that administrative authority and executive privileges are exercised solely for community welfare without personal commercial prospecting.`,
            `3.3 Inclusive Culture: Actively enforcing zero tolerance for workplace toxicity, harassment, or favoritism within leadership and volunteer cohorts.`,
          ],
        },
        {
          heading: "4. Conflict of Interest Governance & Independent Advisory Disclosures",
          clauses: [
            `4.1 Disclosed Independent Ventures: Formal recognition of independent executive leadership, consulting, and advisory activities, specifically recorded as: ${externalVenture}.`,
            `4.2 Ethical Governance: Ensuring that all external advisory engagements remain completely distinct and never conflict with CSC leadership responsibilities.`,
          ],
        },
        {
          heading: "5. Operational SOPs, Program Documentation & Community Asset Governance",
          clauses: [
            `5.1 Standard Operating Playbooks: Authoring and maintaining structured SOPs, event run-sheets, speaker onboarding guidelines, and incident response checklists.`,
            `5.2 Community Asset Ownership: All operational playbooks, checklists, and project management workspaces developed under this mandate belong to Coimbatore Startup Community.`,
          ],
        },
        {
          heading: "6. Operational Data Stewardship, Volunteer Privacy & DPDP Act 2023 Compliance",
          clauses: [
            `6.1 Operational Data Stewardship: Overseeing operational data workflows to ensure end-to-end compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act).`,
            `6.2 Strict Confidentiality of Sensitive Records: Maintaining strict non-disclosure over founder feedback surveys, internal incident reports, and executive council deliberations.`,
          ],
        },
        {
          heading: "7. Discretionary Operating Budgets, Expense Audits & Procurement Approvals",
          clauses: [
            `7.1 Discretionary Operating Limit: Managing pre-approved operational budgets for event production, printed collateral, hospitality, and volunteer kits within council-approved thresholds.`,
            `7.2 Expense Transparency: Ensuring all vendor bills and expense claims are supported by legitimate GST tax invoices and audited payment receipts.`,
          ],
        },
        {
          heading: "8. Active Tenure, Monthly Executive Reviews, 30-Day Transition Protocol & Jurisdiction",
          clauses: [
            `8.1 Active Tenure: Effective for ${duration} throughout active service as Chief Executive Officer.`,
            `8.2 30-Day Notice & Operational Handover: Structured thirty (30) day notice period to transition operational run-sheets, team assignments, and open alliance deliverables.`,
            `8.3 Governing Law: Governed by the laws of India with exclusive jurisdiction in Coimbatore, Tamil Nadu.`,
          ],
        },
      ];

    case "cto":
      return [
        {
          heading: "1. Chief Technology Officer Appointment & Technical Infrastructure Mandate",
          clauses: [
            `1.1 Executive Appointment: This Charter is executed on ${effective} by Coimbatore Startup Community ("CSC"), confirming the appointment of ${leaderName} ("Leader"), serving in the high office of ${leaderRole}.`,
            `1.2 Comprehensive Technology Mandate: Leading all CSC technology strategy, platform architecture, cybersecurity, software engineering, Digital ID approvals, and technical infrastructure delivered exclusively through Logic Intelligence Technologies (LIT).${customMandate ? ` ${customMandate}` : ""}`,
            `1.3 Technical Autonomy & Architectural Authority: Sole and final authority over software frameworks, hosting architectures, database schemas, security patch deployments, and third-party API integrations.`,
          ],
        },
        {
          heading: "2. Full-Stack Software Engineering, Database Architecture & Supabase RLS Enforcement",
          clauses: [
            `2.1 Platform Engineering Excellence: Architecting robust, scalable software across Next.js App Router frontends, serverless API routes, and relational PostgreSQL databases on Supabase.`,
            `2.2 Database Row-Level Security: Implementing fine-grained PostgreSQL Row-Level Security (RLS) policies ensuring zero cross-tenant data leakage and strict isolation of sensitive member records.`,
            `2.3 Automated Monitoring & Uptime: Configuring automated synthetic monitoring, error tracking, and performance tracing targeting 99.5% operational availability for production services.`,
          ],
        },
        {
          heading: "3. Cryptographic Digital Membership IDs, Mobile Wallet Passes & Live Check-In Scanners",
          clauses: [
            `3.1 Cryptographic Digital ID Cards: Architecting and maintaining the tamper-evident CSC Circle Digital Membership ID system featuring SHA-256 signatures, high-contrast dynamic QR codes, and real-time validity checks.`,
            `3.2 Native Mobile Wallet Passes: Generating official Apple Wallet (.pkpass) bundles and Google Wallet passes for member identification at community gatherings.`,
            `3.3 High-Throughput Check-In Terminals: Deploying sub-second cryptographic QR check-in software for summit registration desks, eliminating fraudulent entries.`,
          ],
        },
        {
          heading: "4. Exclusive Technology Delivery through Logic Intelligence Technologies (LIT) & IP Ownership",
          clauses: [
            `4.1 Synergy with LIT Master Partnership: Direct alignment with the Exclusive Technology Partner Agreement designating LIT as sole platform developer.`,
            `4.2 Preservation of LIT Background Codebase: All software source code, database architectures, API designs, and security modules developed by LIT remain 100% LIT's proprietary intellectual property, with operational license to CSC.`,
            `4.3 CSC Community Identity Protection: Respecting and safeguarding CSC's brand identity, domain names, and member community records.`,
          ],
        },
        {
          heading: "5. DPDP Act 2023 Statutory Technical Data Processor Mandate & Zero-Trust Cybersecurity",
          clauses: [
            `5.1 Statutory Technical Data Processor Mandate: Serving as the principal technical data processor under India's Digital Personal Data Protection Act, 2023 (DPDP Act).`,
            `5.2 Security Architecture: Enforcing AES-256 encryption at rest, TLS 1.3 in transit, automated health probes, database Row-Level Security (RLS), and zero-trust administrative access controls.`,
            `5.3 Incident Response & Disaster Recovery: Maintaining automated cloud backups, emergency maintenance failover, and rapid vulnerability remediation protocols.`,
          ],
        },
        {
          heading: "6. Dual Capacity Governance, Arm's-Length Commercial Contracts & Cloud Pass-Through",
          clauses: [
            `6.1 Transparent Venture Disclosure: Official disclosure of Logic Intelligence Technologies — LIT (Founder & CEO) as an independent enterprise technology enterprise, specifically recorded as: ${externalVenture}.`,
            `6.2 Dual Capacity Management: Transparent separation of CTO governance duties from LIT commercial contracts, ensuring high-value technical delivery with zero hidden overheads.`,
            `6.3 Third-Party Pass-Through: Directly passing through third-party infrastructure expenses (WhatsApp/SMS APIs, domain renewals) at actual third-party vendor cost without markups.`,
          ],
        },
        {
          heading: "7. Emergency Incident Response, Uptime Service Level Objectives & Disaster Recovery",
          clauses: [
            `7.1 Emergency Maintenance Authority: Unilateral authority to activate emergency maintenance mode during active cybersecurity incidents, DDoS attacks, or cloud infrastructure degradation.`,
            `7.2 Incident Root Cause Analysis: Providing transparent post-incident reports to the Executive Council within forty-eight (48) hours of critical service disruptions.`,
          ],
        },
        {
          heading: "8. Active Tenure, Code Custody, 30-Day Data Portability Handover & Jurisdiction",
          clauses: [
            `8.1 Active Tenure: Binding for ${duration} for the duration of the CTO mandate.`,
            `8.2 30-Day Transition & Data Portability Protocol: Orderly thirty (30) day notice window providing complete data exports of CSC member records while preserving LIT's proprietary codebases.`,
            `8.3 Governing Law: Governed by the laws of India with exclusive jurisdiction in Coimbatore, Tamil Nadu.`,
          ],
        },
      ];

    case "cco":
      return [
        {
          heading: "1. Chief Community Officer Appointment & Community Culture Stewardship Mandate",
          clauses: [
            `1.1 Executive Appointment: This Charter is executed on ${effective} by Coimbatore Startup Community ("CSC"), confirming the appointment of ${leaderName} ("Leader"), serving in the high office of ${leaderRole}.`,
            `1.2 Community Stewardship Mandate: Spearheading member onboarding, community engagement, founder discussion channels, welcoming new innovators, and curating an inspiring, supportive peer-to-peer ecosystem.${customMandate ? ` ${customMandate}` : ""}`,
            `1.3 Cultural Tone & Community Voice: Preserving CSC's give-first, non-transactional culture and fostering strong inter-founder relationships across Western Tamil Nadu.`,
          ],
        },
        {
          heading: "2. Member Onboarding Architecture, Community Welcome Flows & Engagement Loops",
          clauses: [
            `2.1 Welcome Workflows: Directing structured welcome sequences for new founders joining CSC Circle, introducing them to community norms and relevant founder peers.`,
            `2.2 Peer Matchmaking & Cohort Facilitation: Facilitating introductions between early-stage founders and complementary technical, commercial, or domain specialists.`,
            `2.3 Active Discussion Moderation: Maintaining active, constructive, and inspiring dialogue across official discussion boards, AMAs, and cohort channels.`,
          ],
        },
        {
          heading: "3. Psychological Safety, Inclusive Spaces & Zero-Tolerance Anti-Harassment Enforcement",
          clauses: [
            `3.1 Safe Community Environment: Ensuring all physical gatherings and digital forums maintain absolute psychological safety, mutual respect, and gender inclusivity.`,
            `3.2 Strict Anti-Harassment Enforcement: Immediate intervention and disciplinary action regarding any instances of intimidation, unwanted direct marketing, or discriminatory speech.`,
            `3.3 Trust & Confidentiality: Respecting founder vulnerability and protecting sensitive personal or business struggles shared within closed community circles.`,
          ],
        },
        {
          heading: "4. Conflict of Interest Governance & External Ecosystem Engagements",
          clauses: [
            `4.1 Transparent Venture Disclosure: Official recognition of external community facilitation and independent professional engagements, specifically recorded as: ${externalVenture}.`,
            `4.2 Non-Conflict Commitment: Ensuring external consulting or community projects do not dilute loyalty, engagement, or active presence at CSC flagship programs.`,
          ],
        },
        {
          heading: "5. Volunteer Network Mobilization, Campus Ambassador Management & Mentorship",
          clauses: [
            `5.1 Volunteer Recruitment & Training: Recruiting, onboarding, and training enthusiastic student coordinators and community volunteers for summit operations.`,
            `5.2 Campus Ambassador Network: Coordinating with startup clubs across Coimbatore universities to discover young innovators and student founders.`,
          ],
        },
        {
          heading: "6. Member Data Privacy, Anti-Spam Ethics & DPDP Act 2023 Communication Standards",
          clauses: [
            `6.1 Respect for Founder Privacy: Maintaining strict confidentiality regarding sensitive founder queries, personal feedback, and community grievances.`,
            `6.2 Anti-Spam & Communication Ethics: Ensuring all WhatsApp broadcasts, Telegram channels, and community newsletters operate strictly on an opt-in basis compliant with the Digital Personal Data Protection Act, 2023 (DPDP Act).`,
          ],
        },
        {
          heading: "7. Community Event Budgets, Member Recognition & Swag Distribution Logistics",
          clauses: [
            `7.1 Community Engagement Budget: Managing authorized small budgets for member welcome kits, community awards, and mixer refreshments.`,
            `7.2 Member Recognition Programs: Organizing annual community contributor awards and founder spotlights celebrating regional startup milestones.`,
          ],
        },
        {
          heading: "8. Active Tenure, Moderation Privilege Transfer, 30-Day Handover & Jurisdiction",
          clauses: [
            `8.1 Active Tenure: Active for ${duration} throughout tenure as Chief Community Officer.`,
            `8.2 30-Day Handover Protocol: Transitioning community administrator privileges, communication channel moderation rights, and volunteer rosters upon notice.`,
            `8.3 Governing Law: Governed by the laws of India with exclusive jurisdiction in Coimbatore, Tamil Nadu.`,
          ],
        },
      ];

    case "coo":
      return [
        {
          heading: "1. Chief Operating Officer Appointment & End-to-End On-Ground Operations Mandate",
          clauses: [
            `1.1 Executive Appointment: This Charter is executed on ${effective} by Coimbatore Startup Community ("CSC"), confirming the appointment of ${leaderName} ("Leader"), serving in the high office of ${leaderRole}.`,
            `1.2 End-to-End Operational Mandate: Owning end-to-end event operations, venue logistics, vendor negotiations, stage setup, equipment coordination, on-ground check-in flow, and operational excellence.${customMandate ? ` ${customMandate}` : ""}`,
            `1.3 Execution Discipline: Ensuring all CSC summits, mixers, and founder workshops run on schedule, within safety standards, and with flawless logistical coordination.`,
          ],
        },
        {
          heading: "2. Summit Production, Venue Logistics, Stage Management & Audio/Visual Infrastructure",
          clauses: [
            `2.1 Physical Venue Oversight: Scouting, evaluating, contracting, and managing high-capacity conference halls, innovation auditoriums, and co-working spaces.`,
            `2.2 Production & A/V Infrastructure: Coordinating audio systems, wireless mics, high-lumen projectors, LED stage backdrops, and live recording setups with technical precision.`,
            `2.3 Crowd Flow & Registration Queuing: Designing intuitive venue layout flows, on-ground registration kiosks, and signage that minimize congestion and maximize attendee convenience.`,
          ],
        },
        {
          heading: "3. Vendor Procurement Ethics, Arm's-Length Contracting & Competitive Bidding Protocols",
          clauses: [
            `3.1 Ethical Procurement Standards: Enforcing fair market procurement, obtaining competitive quotations from multiple trusted vendors for staging, catering, printing, and security.`,
            `3.2 Contractual Transparency: Ensuring all vendor contracts are documented in writing with unambiguous SLAs regarding delivery schedules, equipment quality, and cancellation terms.`,
          ],
        },
        {
          heading: "4. Conflict of Interest Governance, APARÈ Clothing & Official Merchandise Governance",
          clauses: [
            `4.1 Formally Disclosed External Venture: Official disclosure of independent lifestyle and apparel enterprise, specifically recorded as: ${externalVenture}.`,
            `4.2 Commercial Independence: Complete separation of APARÈ Clothing business operations from CSC non-profit operations.`,
            `4.3 Transparent Merchandise Collaboration: Any official community apparel, leadership merchandise, or volunteer uniforms supplied by APARÈ Clothing must be approved transparently by the Executive Council at fair market or subsidized cost without self-dealing.`,
          ],
        },
        {
          heading: "5. Venue Health, Fire Safety, Crowd Management & Emergency Response Protocols",
          clauses: [
            `5.1 Safety Compliance: Verifying venue fire safety clearances, marked emergency exits, first-aid preparedness, and crowd density regulations for all physical gatherings.`,
            `5.2 Incident Escalation: Formulating on-ground emergency action protocols in coordination with local civic services, venue authorities, and medical responders.`,
          ],
        },
        {
          heading: "6. On-Ground Physical Attendee Data Security, Badge Printer Controls & DPDP Act Compliance",
          clauses: [
            `6.1 Physical Check-In Data Security: Ensuring physical sign-in sheets, QR scanning stations, and temporary on-site badge printers do not expose attendee phone numbers or emails to unauthorized third parties.`,
            `6.2 Secure Disposal of Temporary Rosters: Immediate secure shredding or digital purging of printed attendee lists following event wrap-up in compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act).`,
          ],
        },
        {
          heading: "7. Operational Asset Inventory, Equipment Storage & Maintenance Care",
          clauses: [
            `7.1 Community Physical Assets: Safe custody, transport, warehousing, and maintenance of all reusable CSC equipment (kiosks, banners, signage, electronics).`,
            `7.2 Asset Inventory Logs: Maintaining an accurate master ledger of all physical property owned by CSC, updating depreciation and inventory logs quarterly.`,
          ],
        },
        {
          heading: "8. Active Tenure, Physical Asset Custody, 30-Day Operational Handover & Jurisdiction",
          clauses: [
            `8.1 Active Tenure: Valid for ${duration} throughout active tenure as Chief Operating Officer.`,
            `8.2 30-Day Operational Handover: Structured handover of vendor contracts, venue keys, physical inventory, and upcoming logistics plans upon notice.`,
            `8.3 Governing Law: Governed by the laws of India with exclusive jurisdiction in Coimbatore, Tamil Nadu.`,
          ],
        },
      ];

    case "cbo":
      return [
        {
          heading: "1. Chief Brand Officer Appointment & Creative Direction Mandate",
          clauses: [
            `1.1 Executive Appointment: This Charter is executed on ${effective} by Coimbatore Startup Community ("CSC"), confirming the appointment of ${leaderName} ("Leader"), serving in the high office of ${leaderRole}.`,
            `1.2 Brand Governance & Visual Storytelling Mandate: Leading CSC brand identity, visual storytelling, cinematic video/reel production, event media coverage, photography, graphic design standards, and digital brand presence.${customMandate ? ` ${customMandate}` : ""}`,
            `1.3 Creative Quality Control: Ensuring all public-facing visual collateral, digital flyers, stage backdrops, and promotional campaigns adhere to world-class aesthetic standards.`,
          ],
        },
        {
          heading: "2. Visual Storytelling, Cinematic Video/Reel Cinematography & Event Media Production",
          clauses: [
            `2.1 Cinematic Media Production: Directing on-ground video crews, interview setups, and gimbal camera cinematography to produce high-impact founder reels, keynotes, and highlight teasers.`,
            `2.2 Brand Aesthetics & Typography: Enforcing cohesive color palettes, typography scales, logo safe-zones, and editorial layouts across all digital and print touchpoints.`,
            `2.3 Social Media Video Strategy: Producing rapid-turnaround short-form video content for Instagram Reels, LinkedIn posts, and YouTube shorts celebrating regional founders.`,
          ],
        },
        {
          heading: "3. Creative Quality Control, Digital Brand Campaigns & Design System Governance",
          clauses: [
            `3.1 Brand Guidelines Governance: Authoring and enforcing the master CSC brand design manual, providing templates for event posters, speaker slides, and digital certificates.`,
            `3.2 Design Consistency: Reviewing and approving all visual materials prior to public launch, ensuring consistency and brand prestige.`,
          ],
        },
        {
          heading: "4. Conflict of Interest Governance, Flickkora Agency & Creative Studio Disclosures",
          clauses: [
            `4.1 Formally Disclosed External Venture: Official disclosure of independent creative media and cinematography agency, specifically recorded as: ${externalVenture}.`,
            `4.2 Operational & Accounting Separation: Complete legal, financial, and client-servicing separation between Flickkora Agency and CSC activities.`,
            `4.3 Transparent Production Arrangements: Any specialized high-end equipment rental, studio editing, or production services provided by Flickkora Agency to CSC must be documented transparently and approved by the Executive Council at fair market or subsidized terms.`,
          ],
        },
        {
          heading: "5. Community Media Asset Ownership, Master Cloud Archival & Intellectual Property",
          clauses: [
            `5.1 Media Asset Ownership: All final edited videos, social reels, photography archives, brand guidelines, typography systems, and promotional graphics produced for CSC belong exclusively to Coimbatore Startup Community.`,
            `5.2 Raw Footage Archival: Ensuring safe cloud archival of all master event footage, keynote recordings, and high-resolution photography for historical community records.`,
          ],
        },
        {
          heading: "6. Attendee Media Privacy, Photography Release Ethics & DPDP Act 2023 Compliance",
          clauses: [
            `6.1 Media Copyright Compliance: Ensuring all soundtrack music, stock graphics, and video elements used in CSC content are properly licensed and free from copyright infringement.`,
            `6.2 Digital Privacy Safeguards: Strict adherence to the Digital Personal Data Protection Act, 2023 (DPDP Act), respecting attendee privacy requests regarding close-up social video features.`,
          ],
        },
        {
          heading: "7. Creative Production Equipment, Print Fabrication Budgets & Vendor Accounting",
          clauses: [
            `7.1 Media Production Budget: Managing allocated budgets for camera accessories, cloud storage, print banner fabrication, and design software subscriptions.`,
            `7.2 Vendor Accounting: Ensuring all flex printing, standee fabrication, and photography invoice payments are supported by GST receipts and audited ledgers.`,
          ],
        },
        {
          heading: "8. Active Tenure, Social Handle & Design Asset Custody, 30-Day Handover & Jurisdiction",
          clauses: [
            `8.1 Active Tenure: Valid for ${duration} throughout active tenure as Chief Brand Officer.`,
            `8.2 30-Day Handover Protocol: Transitioning social media media channels, Figma design systems, Canva team assets, high-resolution media archives, and creative accounts upon notice.`,
            `8.3 Governing Law: Governed by the laws of India with exclusive jurisdiction in Coimbatore, Tamil Nadu.`,
          ],
        },
      ];
  }
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
          heading: "4. Intellectual Property Rights (IPR), Proprietary Code & Brand Licensing",
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
          heading: "7. Terms & Conditions: Warranties, Limitation of Liability & Force Majeure",
          clauses: [
            `7.1 Mutual Representations & Warranties: Each party represents and warrants that it has the full power, corporate authority, and legal capacity to enter into and execute this Agreement.`,
            `7.2 Limitation of Liability Cap: Except for breach of intellectual property covenants or confidentiality obligations, neither party's aggregate liability under this Agreement shall exceed direct expenses incurred during the preceding six (6) months.`,
            `7.3 Force Majeure: Neither party shall be held liable for failure or delay in performance resulting from acts of God, widespread telecommunication blackouts, governmental sanctions, civil unrest, or catastrophic network failure beyond reasonable commercial control.`,
          ],
        },
        {
          heading: "8. Term, Orderly Transition, Dispute Resolution & Jurisdiction",
          clauses: [
            `8.1 Term & Perpetual Auto-Renewal: This Agreement shall remain in full force and effect on a perpetual, auto-renewing basis for ${duration}, subject to annual strategic alignment reviews by both parties.`,
            `8.2 Bilateral Termination & 90-Day Transition Window: Either party may terminate this Agreement by serving ninety (90) days' prior written notice to the other. Upon termination, LIT shall provide standard CSV/JSON database exports of CSC community member records to CSC leadership, while retaining all underlying codebase, frameworks, and intellectual property.`,
            `8.3 Dispute Resolution & Arbitration: Any dispute or claim arising out of or in connection with this Agreement shall be referred to and finally resolved by binding arbitration under the Arbitration and Conciliation Act, 1996. The seat and venue of arbitration shall be Coimbatore, Tamil Nadu, and proceedings shall be conducted in English by a sole arbitrator mutually appointed by the parties.`,
            `8.4 Governing Law: This Agreement is governed by and shall be construed in accordance with the substantive laws of India, with exclusive jurisdiction vested in the competent courts of Coimbatore, Tamil Nadu.`,
          ],
        },
      ];
      if (specialClauses) {
        sections.push({
          heading: "9. Additional Mutually Agreed Covenants",
          clauses: specialClauses.split(/\n+/).filter(Boolean),
        });
      }
      return sections;
    }

    case "leadership_charter": {
      const roleKey = input.leadershipRole || "ceo";
      return buildIndividualizedLeadershipCharter(roleKey, input, effective, duration);
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
            `3.2 Binding Legal Covenants: The provisions of Section 4 (Intellectual Property & Brand Usage), Section 5 (Confidentiality & Non-Disclosure), Section 6 (DPDP Act Data Protection), Section 7 (Terms, Warranties & Liabilities), and Section 8 (Term, Termination & Governing Law) are strictly binding and enforceable under the Indian Contract Act, 1872.`,
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
          heading: "7. Terms & Conditions: Warranties, Disclaimers & Independent Liability",
          clauses: [
            `7.1 Zero Financial Liability Model: This MoU operates on a non-financial cooperative basis. Each party shall independently absorb its own overheads and administrative costs unless a separate, project-specific commercial contract is formally executed in writing.`,
            `7.2 Independent Contractors: The relationship between CSC and ${partnerName} is strictly that of independent entities. Neither party has the legal authority to bind, obligate, or represent the other in financial or legal matters.`,
            `7.3 Mutual Indemnification: Each party agrees to indemnify the other against third-party claims arising from gross negligence, wilful misconduct, or unauthorized use of third-party intellectual property.`,
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
            `4.1 Master Registry & DPDP Act Compliance: All attendee registrations, UPI payment verifications, and cryptographic QR check-in logs processed via CSC Circle remain protected under the Digital Personal Data Protection Act, 2023 (DPDP Act).`,
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
          heading: "6. Terms & Conditions: Event Postponement, Cancellation, Force Majeure & Mutual Indemnity",
          clauses: [
            `6.1 Force Majeure & Good-Faith Rescheduling: Neither party shall be liable for failure to conduct the event due to extreme weather, natural disasters, municipal restrictions, or civic emergencies. In such event, both parties agree to reschedule within forty-five (45) days.`,
            `6.2 Mutual Property & Injury Indemnity: Each party shall be responsible for its own staff, contractors, and on-ground property, indemnifying the other against gross negligence or wilful misconduct occurring on the premises.`,
            `6.3 Third-Party Disclaimers: Neither party assumes liability for personal items lost, stolen, or damaged during on-ground attendance.`,
          ],
        },
        {
          heading: "7. Cybersecurity, Physical Safety & On-Ground Incident Management",
          clauses: [
            `7.1 Digital Ticket Integrity: All attendee entries must be authenticated against CSC Circle live cryptographic check-in scanners to prevent fraudulent badge transfers or unauthorized entry.`,
            `7.2 Emergency Incident Protocol: In case of on-site medical or physical safety incidents, the venue coordinator and CSC operational leads shall coordinate emergency services immediately according to civic safety guidelines.`,
          ],
        },
        {
          heading: "8. Active Term, Electronic Execution & Governing Law",
          clauses: [
            `8.1 Term of Agreement: Valid for ${duration}, concluding upon final post-event audit wrap-up and reconciliation of event assets.`,
            `8.2 Electronic Execution under Section 10A of IT Act, 2000: Executed electronically under Section 10A of the Information Technology Act, 2000, governed by the laws of India, with exclusive jurisdiction in Coimbatore, Tamil Nadu.`,
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
          heading: "6. Terms & Conditions: Event Rescheduling, Organizer Cancellation & Refund Policies",
          clauses: [
            `6.1 Organizer Cancellation Refund: If CSC permanently cancels the sponsored event without rescheduling, all unutilized cash sponsorship fees shall be refunded to Sponsor within ten (10) business days.`,
            `6.2 Good-Faith Rescheduling: If the event is postponed due to weather, civic restrictions, or venue challenges, all sponsorship entitlements and branding deliverables shall seamlessly carry over to the rescheduled date.`,
            `6.3 Sponsor Forfeiture: Cancellations initiated unilaterally by Sponsor within fourteen (14) days of the scheduled event date shall be non-refundable, reflecting print and venue commitments incurred.`,
          ],
        },
        {
          heading: "7. Mutual Indemnification, Limitation of Liability & Commercial Confidentiality",
          clauses: [
            `7.1 Limitation of Liability: Under no circumstances shall either party's aggregate liability under this Agreement exceed the total sponsorship fee actually received by CSC.`,
            `7.2 Commercial Confidentiality: Both parties shall treat the financial consideration, negotiated discounts, and proprietary business discussions as strictly confidential.`,
            `7.3 Mutual Indemnity: Each party shall indemnify and hold harmless the other from third-party IP infringement claims arising from its provided logos, banners, or presentation content.`,
          ],
        },
        {
          heading: "8. Data Privacy Policy & Statutory Information Security Controls",
          clauses: [
            `8.1 Privacy Law Adherence: All data processing associated with this sponsorship must adhere to the Digital Personal Data Protection Act, 2023 (DPDP Act).`,
            `8.2 Lead Generation Protocols: Any contact details exchanged at sponsor exhibition booths must be collected transparently via voluntary badge scanning or explicit business card handshakes.`,
          ],
        },
        {
          heading: "9. Active Term, Audit Compliance & Dispute Resolution",
          clauses: [
            `9.1 Term of Agreement: Valid for ${duration}, covering the pre-event marketing cycle through post-event wrap-up.`,
            `9.2 Dispute Resolution & Jurisdiction: Governed by the laws of India, with exclusive jurisdiction in the competent courts of Coimbatore, Tamil Nadu.`,
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
          heading: "7. Terms & Conditions: Privacy Policy, Data Protection & Limitation of Liability",
          clauses: [
            `7.1 Privacy Policy Adherence: The Speaker's professional profile, bio, and headshot are processed in strict compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act).`,
            `7.2 Limitation of Liability: Neither party shall be liable for consequential, indirect, or incidental damages arising out of session delivery.`,
            `7.3 Force Majeure & Rescheduling: In the event of illness, travel disruption, or unavoidable emergency, the Speaker shall notify CSC promptly to explore digital participation or a rescheduled session date.`,
          ],
        },
        {
          heading: "8. Engagement Term, Survival Obligations & Governing Law",
          clauses: [
            `8.1 Term: This Agreement is effective for ${duration}, with confidentiality and media release provisions surviving session completion.`,
            `8.2 Governing Law & Jurisdiction: Governed by the laws of India, with exclusive jurisdiction vested in Coimbatore, Tamil Nadu.`,
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
              `This Agreement is executed electronically under Section 10A and Section 65B of the Information Technology Act, 2000 and the Indian Contract Act, 1872, and is governed by the laws of India with exclusive jurisdiction in Coimbatore, Tamil Nadu.`,
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
          heading: "4. Data Privacy Policy, Non-Disclosure & DPDP Act 2023 Compliance",
          clauses: [
            `4.1 Confidentiality of Non-Public Information: Both parties agree to protect proprietary operational details, member databases, and commercial discussions with strict confidentiality for a minimum of two (2) years.`,
            `4.2 Compliance with DPDP Act, 2023: Both parties agree to adhere strictly to the Digital Personal Data Protection Act, 2023, ensuring zero unauthorized transfer, scraping, or commercial sale of personal member records.`,
          ],
        },
        {
          heading: "5. General Terms & Conditions: Warranties, Limitation of Liability & Force Majeure",
          clauses: [
            `5.1 Mutual Representations: Each party represents that it holds the necessary authorizations and power to execute this Agreement.`,
            `5.2 Limitation of Liability: Neither party shall be liable for indirect, punitive, or consequential damages arising out of performance under this Agreement.`,
            `5.3 Force Majeure: Neither party shall be liable for delays caused by circumstances beyond reasonable control, including natural disasters, governmental mandates, or civic disruptions.`,
          ],
        },
        {
          heading: "6. Active Duration, Bilateral Notice & Orderly Handover",
          clauses: [
            `6.1 Active Duration: This Agreement remains in effect for ${duration} from ${effective}, renewable by mutual written consent.`,
            `6.2 Notice for Termination: Either party may conclude this Agreement by providing thirty (30) days' advance written notice, ensuring all ongoing deliverables are concluded equitably.`,
          ],
        },
        {
          heading: "7. Electronic Execution, Statutory Validity & Jurisdiction",
          clauses: [
            `7.1 Electronic Execution Validity: This Agreement is executed electronically and authenticated under Section 10A and Section 65B of the Information Technology Act, 2000 and the Indian Contract Act, 1872.`,
            `7.2 Governing Law: Governed by the laws of India, with exclusive jurisdiction vested in the competent courts of Coimbatore, Tamil Nadu.`,
          ],
        },
      ];
    }
  }
}
