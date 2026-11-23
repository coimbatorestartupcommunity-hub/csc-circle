import crypto from "node:crypto";
import { getSupabase } from "../services/live-queries.js";
import {
  CSC_IDENTITY,
  CSC_LEADERSHIP,
  CSC_TECHNICAL_PARTNER,
  CSC_PLATFORM_PILLARS,
  CSC_COMMUNITY_CONTACTS,
} from "../ai/knowledge-base.js";

export interface KnowledgeDocDef {
  source_id: string;
  category: string;
  title: string;
  slug: string;
  content: string;
  metadata: Record<string, any>;
  tier: number;
}

export const COMPREHENSIVE_KNOWLEDGE_DOCS: KnowledgeDocDef[] = [
  // 1-8: CORE IDENTITY & ECOSYSTEM
  {
    source_id: "identity:tagline-and-oneliner",
    category: "community",
    title: "CSC Circle Identity, Tagline & One-Liner",
    slug: "csc-tagline-and-oneliner",
    content: `Coimbatore Startup Community (CSC Circle) is Coimbatore's premier founder-first startup ecosystem. Tagline: "${CSC_IDENTITY.tagline}". One-Liner: "${CSC_IDENTITY.oneLiner}". Official Web Portal: ${CSC_IDENTITY.portalUrl}. The community connects ambitious founders, engineers, creators, and mentors to build enduring companies from Coimbatore.`,
    metadata: { tagline: CSC_IDENTITY.tagline, portalUrl: CSC_IDENTITY.portalUrl },
    tier: 1,
  },
  {
    source_id: "identity:mission-and-vision",
    category: "community",
    title: "CSC Mission & Strategic Vision",
    slug: "csc-mission-and-vision",
    content: `Mission: ${CSC_IDENTITY.mission}. Vision: ${CSC_IDENTITY.vision}. CSC exists to democratize startup access in Tier-2 and Tier-3 hubs across Tamil Nadu, providing founders with peer support, capital connections, talent networks, and institutional infrastructure without having to migrate to Tier-1 metros.`,
    metadata: { established: 2024, region: "Coimbatore, Tamil Nadu, India" },
    tier: 1,
  },
  {
    source_id: "identity:platform-pillars",
    category: "community",
    title: "CSC Circle Platform Pillars",
    slug: "csc-platform-pillars",
    content: `CSC operates on four foundational pillars: 1. Community (peer networking, founder circles, bi-weekly meetups). 2. Knowledge (practical playbooks, teardowns, mentorship, legal blueprints). 3. Resources (pitch decks, grant applications, vetted toolkits). 4. Growth (talent acquisition, co-founder discovery, investor introductions, and market access).`,
    metadata: { pillars: ["Community", "Knowledge", "Resources", "Growth"] },
    tier: 1,
  },
  {
    source_id: "identity:biweekly-meetups",
    category: "events",
    title: "Bi-Weekly Ecosystem Meetup Format",
    slug: "csc-biweekly-meetups",
    content: `CSC hosts bi-weekly in-person founder meetups across Coimbatore on the 1st and 3rd Saturdays of every month. Sessions feature startup teardowns, pitch practices, regulatory updates, founder AMA sessions, and networking. Registrations are managed on https://csc.logicintelligencetechnologies.in/events with digital entry passes.`,
    metadata: { cadence: "1st and 3rd Saturdays", city: "Coimbatore" },
    tier: 1,
  },
  {
    source_id: "identity:eligibility",
    category: "membership",
    title: "Who Can Join CSC Circle (Eligibility Criteria)",
    slug: "csc-membership-eligibility",
    content: `Eligibility for CSC Circle is open and inclusive: early-stage founders, bootstrapped creators, student innovators, tech professionals, seasoned entrepreneurs, and startup mentors. You DO NOT need a registered legal entity (Pvt Ltd, LLP) to join or participate. Anyone validating an idea or actively building is welcome to register at https://csc.logicintelligencetechnologies.in/signup.`,
    metadata: { legalEntityRequired: false, freeToJoin: true },
    tier: 1,
  },
  {
    source_id: "identity:geographic-scope",
    category: "community",
    title: "Geographic Scope & Regional Inclusivity",
    slug: "csc-geographic-scope",
    content: `While rooted in the vibrant entrepreneurial ecosystem of Coimbatore, CSC Circle welcomes founders, builders, and ecosystem collaborators across Tamil Nadu (Tiruppur, Erode, Salem, Madurai, Chennai) and global diaspora founders building tech or physical ventures connected to the region.`,
    metadata: { hub: "Coimbatore", extendedRegion: "Tamil Nadu & Diaspora" },
    tier: 1,
  },
  {
    source_id: "identity:value-propositions",
    category: "community",
    title: "Value Propositions for Startup Founders",
    slug: "csc-founder-value-props",
    content: `Founders join CSC Circle to: 1. Receive unvarnished feedback from peer founders. 2. Discover co-founders and early core engineers. 3. Access verified investors and Angel Networks. 4. Benefit from automated 5-minute digital membership passes. 5. Leverage institutional partnerships with top universities and co-working spaces in Coimbatore.`,
    metadata: { focus: "Founder-First Value" },
    tier: 1,
  },
  {
    source_id: "identity:culture-and-values",
    category: "community",
    title: "CSC Core Culture & Community Norms",
    slug: "csc-culture-and-values",
    content: `CSC is built on a culture of 'Give-First'. Founders share real numbers, honest failures, and actionable insights. We prohibit predatory sales, aggressive self-promotion, and zero-sum competition. Collaboration and mutual elevation define the community standard.`,
    metadata: { ethos: "Give-First Collaboration" },
    tier: 1,
  },

  // 9-16: LEADERSHIP & KEY STAKEHOLDERS
  {
    source_id: "leadership:founder-kn-reyash",
    category: "leadership",
    title: "Founder: K. N. Reyash & Belvoria",
    slug: "founder-kn-reyash-profile",
    content: `K. N. Reyash is the Founder of Coimbatore Startup Community (CSC Circle). He provides overall vision, ecosystem strategy, and founder community direction. He is also the Founder of Belvoria (https://belvoria.vercel.app/). Responsibility: ${CSC_LEADERSHIP.founder.responsibility}. Key initiatives: Shaping founder networks, approving ecosystem programs, and coordinating community meetups.`,
    metadata: { name: "K. N. Reyash", role: "Founder", org: "Belvoria" },
    tier: 1,
  },
  {
    source_id: "leadership:cofounder-er-sharan",
    category: "leadership",
    title: "Co-Founder: E. R. Sharan & CECIL Groups",
    slug: "cofounder-er-sharan-profile",
    content: `E. R. Sharan is the Co-Founder of Coimbatore Startup Community (CSC Circle). He is the Founder of CECIL Groups of Companies & Industries. Responsibility: ${CSC_LEADERSHIP.cofounder.responsibility}. He oversees external partnerships, industrial collaborations, venue sponsorships, and strategic alliances across Coimbatore's business corridors.`,
    metadata: { name: "E. R. Sharan", role: "Co-Founder", org: "CECIL Groups" },
    tier: 1,
  },
  {
    source_id: "leadership:ceo-mirra-mahendran",
    category: "leadership",
    title: "Chief Executive Officer (CEO): Mirra Mahendran",
    slug: "ceo-mirra-mahendran-profile",
    content: `Mirra Mahendran is the Chief Executive Officer (CEO) of Coimbatore Startup Community (CSC Circle). Background: Pursuing BA (Hons) International Business at PSG Institute of Advanced Studies (PSG IAS). Responsibility: ${CSC_LEADERSHIP.ceo.responsibility}. She leads community operations, youth and student startup initiatives, campus incubation alliances, and ecosystem engagement.`,
    metadata: { name: "Mirra Mahendran", role: "CEO", institution: "PSG IAS" },
    tier: 1,
  },
  {
    source_id: "leadership:cto-vikash-saravanan",
    category: "leadership",
    title: "Chief Technology Officer (CTO): Vikash Saravanan",
    slug: "cto-vikash-saravanan-profile",
    content: `Vikash Saravanan is the Chief Technology Officer (CTO) of CSC Circle and the Founder & CEO of Logic Intelligence Technologies (LIT). Responsibility: ${CSC_LEADERSHIP.cto.responsibility}. He architects the CSC Circle digital web platform, automated WhatsApp infrastructure, pass verification engine, and security defense protocols. Website: https://www.logicintelligencetechnologies.in`,
    metadata: { name: "Vikash Saravanan", role: "CTO", company: "Logic Intelligence Technologies" },
    tier: 1,
  },
  {
    source_id: "leadership:technical-partner-lit",
    category: "technology",
    title: "Technical Partner: Logic Intelligence Technologies (LIT)",
    slug: "technical-partner-logic-intelligence-technologies",
    content: `Logic Intelligence Technologies (LIT) is the official Technical Partner of Coimbatore Startup Community (CSC Circle). Led by Vikash Saravanan (Founder & CEO, LIT / CTO, CSC). LIT engineers and maintains the high-availability digital portal (https://csc.logicintelligencetechnologies.in), database infrastructure, pass generation systems, Redis queuing, and 24/7 AI-powered conversational agent. Support: hello@logicintelligencetechnologies.in`,
    metadata: { partner: "Logic Intelligence Technologies", website: "https://www.logicintelligencetechnologies.in" },
    tier: 1,
  },
  {
    source_id: "leadership:coo-kishore-c",
    category: "leadership",
    title: "Chief Operating Officer (COO): Kishore C",
    slug: "coo-kishore-c-profile",
    content: `Kishore C is the Chief Operating Officer (COO) of CSC Circle and Founder of APARÈ Clothing. Responsibility: ${CSC_LEADERSHIP.coo.responsibility}. He manages day-to-day community operations, physical event logistics, venue coordination, and attendee reception during all major ecosystem gatherings.`,
    metadata: { name: "Kishore C", role: "COO", venture: "APARÈ Clothing" },
    tier: 1,
  },
  {
    source_id: "leadership:cbo-jaibharath-v",
    category: "leadership",
    title: "Chief Brand Officer (CBO): Jaibharath V",
    slug: "cbo-jaibharath-v-profile",
    content: `Jaibharath V is the Chief Brand Officer (CBO) of CSC Circle and Founder of Flickkora Agency. Responsibility: ${CSC_LEADERSHIP.cbo.responsibility}. He oversees brand design, creative direction, media outreach, social storytelling, visual branding, and ecosystem marketing across Instagram, LinkedIn, and YouTube.`,
    metadata: { name: "Jaibharath V", role: "CBO", agency: "Flickkora Agency" },
    tier: 1,
  },
  {
    source_id: "leadership:cco-swathi",
    category: "leadership",
    title: "Chief Community Officer (CCO): Swathi",
    slug: "cco-swathi-profile",
    content: `Swathi is the Chief Community Officer (CCO) of CSC Circle. Responsibility: ${CSC_LEADERSHIP.cco.responsibility}. She directs member onboarding, community engagement, founder group moderation, wellness initiatives, and peer support networks across all official channels.`,
    metadata: { name: "Swathi", role: "CCO" },
    tier: 1,
  },

  // 17-24: MEMBERSHIP, CLAIMING & DIGITAL ID PASSES
  {
    source_id: "membership:5min-approval",
    category: "membership",
    title: "5-Minute Automated Membership Approval",
    slug: "membership-5min-approval-system",
    content: `CSC Circle operates a 100% deterministic, 5-minute automated membership approval system. When a founder registers and submits their claim at https://csc.logicintelligencetechnologies.in/profile/claim, the platform runs background sanitization and instantly approves the membership upon expiration of the 5-minute window. No arbitrary rejections. Membership IDs follow the format CSC-XXXX.`,
    metadata: { approvalWindowMinutes: 5, format: "CSC-XXXX" },
    tier: 1,
  },
  {
    source_id: "membership:how-to-claim",
    category: "membership",
    title: "How to Claim Your CSC Membership ID",
    slug: "membership-claim-step-by-step",
    content: `To claim your official CSC Digital Membership: 1. Sign up or log in at https://csc.logicintelligencetechnologies.in/login. 2. Navigate to https://csc.logicintelligencetechnologies.in/profile/claim. 3. Enter your full name, WhatsApp contact number, and venture/role details. 4. Submit. The system initiates the 5-minute verification counter, after which your Digital ID Pass is generated and ready to download.`,
    metadata: { stepByStepUrl: "https://csc.logicintelligencetechnologies.in/profile/claim" },
    tier: 1,
  },
  {
    source_id: "membership:digital-id-card",
    category: "membership",
    title: "CSC Digital ID Pass & QR Code Verification",
    slug: "membership-digital-id-pass",
    content: `Every active member is issued a cryptographic Digital Membership Card available at https://csc.logicintelligencetechnologies.in/profile/id-card. It features your Member ID, full name, registered role, joining date, and a dynamic verification QR code. Organizers and partners verify authenticity by scanning the QR code, redirecting to https://csc.logicintelligencetechnologies.in/verify/member.`,
    metadata: { verificationUrl: "https://csc.logicintelligencetechnologies.in/verify/member" },
    tier: 1,
  },
  {
    source_id: "membership:apple-google-wallet",
    category: "membership",
    title: "Apple Wallet & Google Wallet Integration",
    slug: "membership-wallet-passes",
    content: `Members can store their official CSC Digital ID Card directly inside Apple Wallet (.pkpass) on iOS and Google Wallet on Android. Passes update dynamically with membership status, upcoming event check-in codes, and offline NFC verification tokens. Download your wallet pass from https://csc.logicintelligencetechnologies.in/profile/id-card.`,
    metadata: { walletPlatforms: ["Apple Wallet", "Google Wallet"] },
    tier: 1,
  },
  {
    source_id: "membership:phone-verification-popup",
    category: "membership",
    title: "Member Mobile Number Verification Modal",
    slug: "membership-phone-verification-flow",
    content: `To enable instant WhatsApp delivery of event passes, meeting links, and digital ID cards, CSC Circle prompts unverified logged-in users with a mobile number verification modal. Users enter their 10-digit number, receive a 6-digit WhatsApp OTP, and verify their profile in seconds. Members may also update and verify their mobile number at https://csc.logicintelligencetechnologies.in/profile/settings.`,
    metadata: { channel: "WhatsApp OTP", digits: 6 },
    tier: 1,
  },
  {
    source_id: "membership:member-directory-profile",
    category: "membership",
    title: "Public Member Profile & Showcase",
    slug: "membership-public-profile",
    content: `Active members receive a dedicated public profile page located at https://csc.logicintelligencetechnologies.in/members/[slug]. It displays your founder bio, technical skill tags, linked startups, LinkedIn and Twitter handles, and portfolio projects. Members control visibility in their Profile Privacy Settings.`,
    metadata: { directoryUrl: "https://csc.logicintelligencetechnologies.in/members" },
    tier: 1,
  },
  {
    source_id: "membership:benefits-summary",
    category: "membership",
    title: "Comprehensive CSC Member Benefits",
    slug: "membership-benefits-summary",
    content: `Benefits of holding an active CSC Membership: 1. Priority free admission to all bi-weekly meetups. 2. Direct listing in the Coimbatore Startup Directory. 3. Access to private WhatsApp founder networking channels. 4. Co-working discounts and partner venue privileges. 5. Fast-track review for founder spotlight features and investor demo days.`,
    metadata: { freeMembership: true, tier: "Active Community Member" },
    tier: 1,
  },
  {
    source_id: "membership:lost-pass-recovery",
    category: "membership",
    title: "How to Recover a Lost Pass or Member ID",
    slug: "membership-lost-pass-recovery",
    content: `If you misplaced your Member ID or pass link: 1. Log in to https://csc.logicintelligencetechnologies.in/login with your registered email. 2. Go to Profile > ID Card to download a fresh copy. 3. Alternatively, text 'STATUS' or your registered email to the official WhatsApp agent (+91 7550067712) to receive your ID details instantly.`,
    metadata: { recoveryMethod: "Web Login or WhatsApp Agent" },
    tier: 1,
  },

  // 25-32: EVENTS, BOOKINGS, PASSES & CHECK-IN
  {
    source_id: "events:discovery-and-rsvp",
    category: "events",
    title: "How to Discover & Register for CSC Events",
    slug: "events-discovery-and-rsvp",
    content: `All upcoming physical workshops, ecosystem mixers, and virtual masterclasses are listed on https://csc.logicintelligencetechnologies.in/events. Members can RSVP with one click. Upon successful registration, the system issues a digital ticket pass containing a scannable QR code and adds the event to your profile under Profile > Events.`,
    metadata: { eventsUrl: "https://csc.logicintelligencetechnologies.in/events" },
    tier: 1,
  },
  {
    source_id: "events:in-person-checkin",
    category: "events",
    title: "In-Person Event Check-In Procedure",
    slug: "events-in-person-checkin-process",
    content: `At physical venues: 1. Open your digital event pass from your email, Apple/Google Wallet, or Profile > Events. 2. Present the dynamic QR code at the reception desk. 3. Organizers scan the pass using the admin check-in tool (https://csc.logicintelligencetechnologies.in/admin/check-in), marking your attendance in real-time.`,
    metadata: { checkInType: "QR Code Scan" },
    tier: 1,
  },
  {
    source_id: "events:google-meet-checkin",
    category: "events",
    title: "Virtual Google Meet Check-In & Live Verification",
    slug: "events-google-meet-checkin",
    content: `For online webinars and virtual AMAs hosted on Google Meet: CSC implements a secure check-in portal at https://csc.logicintelligencetechnologies.in/events/google-meet/check-in. Attendees authenticate using their registered email or access token to confirm attendance and immediately receive the Google Meet joining URL.`,
    metadata: { virtualPlatform: "Google Meet", portal: "/events/google-meet/check-in" },
    tier: 1,
  },
  {
    source_id: "events:cancellation-policy",
    category: "events",
    title: "Event Registration Cancellation & Etiquette",
    slug: "events-cancellation-policy",
    content: `Venue capacities for in-person founder meetups are strictly capped to maintain high-signal networking. If you RSVP but cannot attend, please cancel your registration at least 48 hours prior via Profile > Events so your seat can be automatically reallocated to founders on the waiting list. Repeated no-shows without cancellation may lead to temporary RSVP restrictions.`,
    metadata: { noticeHours: 48 },
    tier: 1,
  },
  {
    source_id: "events:host-propose-session",
    category: "events",
    title: "How to Propose a Workshop or Event Session",
    slug: "events-propose-workshop",
    content: `CSC encourages experienced founders, fractional CTOs, VCs, and legal specialists to lead ecosystem workshops. Propose a session through the event proposal endpoint or email hello@logicintelligencetechnologies.in / coimbatorestartupcommunity@gmail.com with your topic, speaker bio, and target audience takeaway. The community team reviews submissions within 3 business days.`,
    metadata: { proposalChannel: "Web Form or Community Email" },
    tier: 1,
  },
  {
    source_id: "events:apple-google-event-passes",
    category: "events",
    title: "Apple & Google Wallet Passes for Events",
    slug: "events-wallet-pass-support",
    content: `Every event booking generates an individual Apple Wallet (.pkpass) and Google Wallet pass. Passes display venue location, starts_at timestamp, directions, seat category, and automatic lockscreen geofenced notifications when you arrive at the venue in Coimbatore. Access your passes at https://csc.logicintelligencetechnologies.in/app/events/my-passes.`,
    metadata: { url: "/app/events/my-passes" },
    tier: 1,
  },
  {
    source_id: "events:attendance-certificates",
    category: "events",
    title: "Attendance Verification & Proof of Participation",
    slug: "events-attendance-proof",
    content: `After attending a certified CSC masterclass or flagship summit, attendees can generate a cryptographically verified Proof of Attendance certificate directly from their member profile. Certificates feature an on-chain/database hash suitable for LinkedIn credential showcases and student academic credit submission.`,
    metadata: { feature: "Verifiable Attendance Certificate" },
    tier: 1,
  },
  {
    source_id: "events:safety-and-conduct",
    category: "events",
    title: "Event Safety, Inclusivity & Zero Harassment",
    slug: "events-safety-and-conduct",
    content: `All CSC events adhere to our strict Community Guidelines. Disruptive conduct, commercial hawking, unsolicited recordings, and discriminatory behavior are forbidden. Event marshals and organizers have the authority to remove non-compliant attendees immediately without refund or recourse.`,
    metadata: { policy: "Zero Harassment" },
    tier: 1,
  },

  // 33-40: STARTUP DIRECTORY, REVIEWS & CONSULTATIONS
  {
    source_id: "directory:overview-and-search",
    category: "directory",
    title: "Coimbatore Startup Directory Overview",
    slug: "directory-overview-and-search",
    content: `The Coimbatore Startup Directory (https://csc.logicintelligencetechnologies.in/directory) is the definitive index of startups founded, headquartered, or operating in Coimbatore. Browse by sector (SaaS, DeepTech, Agritech, EV, Healthcare, Manufacturing, EdTech), funding stage (Bootstrapped, Pre-Seed, Seed, Series A), and hiring status.`,
    metadata: { directoryUrl: "https://csc.logicintelligencetechnologies.in/directory" },
    tier: 1,
  },
  {
    source_id: "directory:how-to-list-startup",
    category: "directory",
    title: "How to List Your Startup in the Directory",
    slug: "directory-how-to-list-startup",
    content: `To submit your venture to the Startup Directory: 1. Log in and navigate to https://csc.logicintelligencetechnologies.in/profile/startups/new. 2. Fill in your startup name, tagline, sector, year founded, website URL, team size, and high-resolution logo. 3. Submit for ecosystem review. The editorial team verifies details and publishes your profile within 48 hours.`,
    metadata: { submissionUrl: "https://csc.logicintelligencetechnologies.in/profile/startups/new" },
    tier: 1,
  },
  {
    source_id: "directory:startup-revisions",
    category: "directory",
    title: "Updating Startup Profiles & Revisions Workflow",
    slug: "directory-startup-revisions",
    content: `Founders can update pitch decks, fundraising milestones, hiring openings, and product pivots at any time at https://csc.logicintelligencetechnologies.in/profile/startups. Revisions undergo audit tracking to maintain data integrity and prevent unauthorized modifications by third parties.`,
    metadata: { workflow: "Versioned Revisions" },
    tier: 1,
  },
  {
    source_id: "directory:founder-spotlight-feature",
    category: "directory",
    title: "Fortnightly Founder Spotlight Program",
    slug: "directory-founder-spotlight-program",
    content: `Every two weeks, CSC features an approved standout startup from the directory across all community broadcast channels, social handles (Instagram, LinkedIn), and the official WhatsApp agent (reply 'SPOTLIGHT' to view). Selection is based on product traction, milestone achievements, and active community participation.`,
    metadata: { triggerKeyword: "SPOTLIGHT", cadence: "Fortnightly" },
    tier: 1,
  },
  {
    source_id: "consultations:founder-advisory",
    category: "consultations",
    title: "1-on-1 Founder Consultations & Mentorship",
    slug: "consultations-founder-advisory",
    content: `CSC offers 1-on-1 consultation sessions connecting early builders with senior mentors, technical architects from Logic Intelligence Technologies, and experienced operators. Request a consultation at https://csc.logicintelligencetechnologies.in/profile/consultations covering product architecture, pitch deck feedback, go-to-market strategies, and hiring frameworks.`,
    metadata: { portal: "/profile/consultations" },
    tier: 1,
  },
  {
    source_id: "consultations:technical-review-lit",
    category: "consultations",
    title: "Technical Architecture Advisory with LIT",
    slug: "consultations-technical-architecture-lit",
    content: `Startups facing engineering bottlenecks, cloud infrastructure scaling challenges, AI model deployment questions, or security compliance concerns can request technical architecture reviews with CTO Vikash Saravanan and the senior engineering team at Logic Intelligence Technologies. Inquire at hello@logicintelligencetechnologies.in.`,
    metadata: { advisor: "Logic Intelligence Technologies" },
    tier: 1,
  },
  {
    source_id: "directory:reviews-and-testimonials",
    category: "directory",
    title: "Founder Reviews & Community Testimonials",
    slug: "directory-reviews-and-testimonials",
    content: `Community members can share reviews and testimonials regarding workshops, mentorship sessions, and collaborations at https://csc.logicintelligencetechnologies.in/profile/reviews. Approved testimonials appear on the homepage and ecosystem impact reports to guide prospective members.`,
    metadata: { portal: "/profile/reviews" },
    tier: 1,
  },
  {
    source_id: "directory:verified-badge-criteria",
    category: "directory",
    title: "Verified Startup Badge & Quality Standards",
    slug: "directory-verified-badge-criteria",
    content: `Startups in the directory displaying the 'Verified' badge have completed founder identity confirmation, active domain check, and registered operational presence in or around Coimbatore. Verification builds trust with corporate partners, institutional incubators, and angel investors browsing the portal.`,
    metadata: { badge: "Verified CSC Startup" },
    tier: 1,
  },

  // 41-48: COLLABORATIONS, RESOURCES, OPPORTUNITIES & UPDATES
  {
    source_id: "collaborations:overview",
    category: "collaborations",
    title: "CSC Strategic Collaborations Overview",
    slug: "collaborations-overview-and-partners",
    content: `CSC collaborates with premier academic institutions (e.g. PSG Institute of Advanced Studies), incubation cells, co-working networks, and corporate enterprise partners across Coimbatore. View current institutional partners and ecosystem agreements at https://csc.logicintelligencetechnologies.in/collaborations.`,
    metadata: { portal: "https://csc.logicintelligencetechnologies.in/collaborations" },
    tier: 1,
  },
  {
    source_id: "collaborations:how-to-partner",
    category: "collaborations",
    title: "How to Propose an Ecosystem Partnership",
    slug: "collaborations-propose-partnership",
    content: `Colleges, co-working spaces, investor networks, and technology firms interested in partnering with Coimbatore Startup Community can submit partnership proposals at https://csc.logicintelligencetechnologies.in/collaborations or email co-founder E. R. Sharan and the leadership desk at coimbatorestartupcommunity@gmail.com. We offer campus hackathon partnerships, incubation support, and founder event sponsorships.`,
    metadata: { desk: "Partnerships & Collaborations" },
    tier: 1,
  },
  {
    source_id: "resources:startup-toolkits",
    category: "resources",
    title: "Ecosystem Startup Resources & Toolkits Hub",
    slug: "resources-startup-toolkits-hub",
    content: `The CSC Resources Hub (https://csc.logicintelligencetechnologies.in/resources) provides verified playbooks, pitch deck templates, cap table spreadsheets, NDAs, founder advisor agreements, and government grant application guides (Startup India Seed Fund, TANSIM EDII-TN). All materials are free for active members.`,
    metadata: { portal: "https://csc.logicintelligencetechnologies.in/resources" },
    tier: 1,
  },
  {
    source_id: "resources:propose-resource",
    category: "resources",
    title: "Contributing Resources to the Community Hub",
    slug: "resources-contribute-playbook",
    content: `Founders and subject-matter experts who have built useful calculators, hiring rubrics, marketing frameworks, or tech stack guides can submit them to the community resources library. Approved submissions credit the author's startup profile and receive highlighted exposure across our weekly digest.`,
    metadata: { contribution: "Open Ecosystem Knowledge" },
    tier: 1,
  },
  {
    source_id: "opportunities:job-board-cofounders",
    category: "opportunities",
    title: "CSC Opportunities, Co-Founder & Job Board",
    slug: "opportunities-job-board-cofounders",
    content: `The Opportunities portal (https://csc.logicintelligencetechnologies.in/opportunities) features active startup job openings, early engineering internships, equity-based co-founder matchmaking, and advisory board postings across Coimbatore startups. Founders can post opportunities directly from Profile > Opportunities.`,
    metadata: { portal: "https://csc.logicintelligencetechnologies.in/opportunities" },
    tier: 1,
  },
  {
    source_id: "opportunities:post-an-opportunity",
    category: "opportunities",
    title: "How to Post a Hiring or Co-Founder Opening",
    slug: "opportunities-post-opening",
    content: `Verified members can list open positions at https://csc.logicintelligencetechnologies.in/profile/opportunities. Specify role title, employment type (Full-Time, Internship, Co-Founder Equity), technical requirements, stipend/salary range, and application URL or email. Opportunities are syndicated to the community feed.`,
    metadata: { postingUrl: "/profile/opportunities" },
    tier: 1,
  },
  {
    source_id: "updates:ecosystem-news-feed",
    category: "updates",
    title: "CSC Ecosystem Updates & Announcement Feed",
    slug: "updates-ecosystem-news-feed",
    content: `Stay informed with official announcements, policy changes, partner benefits, and founder victory milestones at https://csc.logicintelligencetechnologies.in/updates. Our editorial team publishes weekly summaries celebrating seed rounds raised, product launches, patent grants, and upcoming community initiatives.`,
    metadata: { portal: "https://csc.logicintelligencetechnologies.in/updates" },
    tier: 1,
  },
  {
    source_id: "updates:newsletter-broadcasts",
    category: "updates",
    title: "Ecosystem Digest & Community Email Broadcasts",
    slug: "updates-newsletter-broadcasts",
    content: `Members subscribed to ecosystem updates receive our fortnightly curated digest highlighting top discussion topics, featured founders, upcoming physical meetups, and exclusive partner perks. Members can manage notification frequencies under Profile > Settings.`,
    metadata: { type: "Curated Fortnightly Digest" },
    tier: 1,
  },

  // 49-56: LEGAL POLICIES, TERMS & DPDP ACT 2023 COMPLIANCE
  {
    source_id: "legal:privacy-policy-overview",
    category: "legal",
    title: "Privacy Policy Overview & DPDP Act 2023 Compliance",
    slug: "legal-privacy-policy-dpdp-act",
    content: `CSC Circle operates in strict compliance with India's Digital Personal Data Protection Act, 2023 (DPDP Act). Official Privacy Policy: https://csc.logicintelligencetechnologies.in/privacy. Operated in technical partnership with Logic Intelligence Technologies (LIT). Effective Date: November 22, 2026. We uphold Purpose Limitation, Data Minimization, and complete Consent & Control.`,
    metadata: { act: "DPDP Act 2023", compliance: "India Law", portal: "/privacy" },
    tier: 1,
  },
  {
    source_id: "legal:data-inventory-collection",
    category: "legal",
    title: "Data Inventory: What Information We Collect",
    slug: "legal-data-inventory-collection",
    content: `We collect only necessary information: 1. Identity & Contact (Full name, email address, WhatsApp mobile number). 2. Startup Profile (Venture name, sector, stage, website). 3. Event Operations (RSVP timestamps, QR ticket check-ins). 4. Technical Logs (IP address, user agent for rate-limiting and security). We never sell, lease, or monetize your personal or commercial data.`,
    metadata: { dataMinimization: true, monetization: "Zero Third-Party Data Selling" },
    tier: 1,
  },
  {
    source_id: "legal:data-subject-rights",
    category: "legal",
    title: "Your Rights as a Data Subject (DPDP Act 2023)",
    slug: "legal-data-subject-rights",
    content: `Under the DPDP Act 2023, members have: 1. Right to Access (inspect personal data processed). 2. Right to Correction & Updating. 3. Right to Erasure / Deletion (request complete purge of account and records). 4. Right to Nominate and Grievance Redressal. Submit data requests to Data Protection Officer (DPO) Vikash Saravanan at hello@logicintelligencetechnologies.in.`,
    metadata: { dpoEmail: "hello@logicintelligencetechnologies.in" },
    tier: 1,
  },
  {
    source_id: "legal:terms-and-conditions",
    category: "legal",
    title: "Terms and Conditions of Service",
    slug: "legal-terms-and-conditions",
    content: `Review the full Terms and Conditions at https://csc.logicintelligencetechnologies.in/terms. By accessing the platform or participating in community programs, you agree to lawful usage, truthful founder representation, compliance with Community Guidelines, and non-violation of intellectual property. CSC reserves the right to suspend accounts engaged in fraud, spam, or harassment.`,
    metadata: { portal: "https://csc.logicintelligencetechnologies.in/terms" },
    tier: 1,
  },
  {
    source_id: "legal:anti-scraping-policy",
    category: "security",
    title: "Anti-Scraping & Directory Protection Protocol",
    slug: "legal-anti-scraping-protocol",
    content: `Extracting member phone numbers, scraping founder emails, harvesting startup directory entries, or mass-downloading digital ID cards using automated scrapers, headless browsers, or curl loops is strictly prohibited. Automated abuse triggers immediate IP blacklisting, Supabase API key revocation, and legal reporting under the Information Technology Act.`,
    metadata: { enforcement: "Automated Rate Limiter & IP Block" },
    tier: 1,
  },
  {
    source_id: "legal:unsolicited-dm-policy",
    category: "legal",
    title: "Zero Tolerance for Cold Pitching & Unsolicited DMs",
    slug: "legal-unsolicited-dm-prohibition",
    content: `Direct messaging CSC members on WhatsApp, LinkedIn, or email with cold sales pitches, commercial agency pitches, cryptocurrency schemes, or recruitment solicitations without prior mutual consent is strictly prohibited. Offending members face immediate ecosystem expulsion and revoking of membership credentials.`,
    metadata: { penalty: "Immediate Account Termination" },
    tier: 1,
  },
  {
    source_id: "legal:data-retention-storage",
    category: "legal",
    title: "Data Storage & Retention Standards",
    slug: "legal-data-storage-retention",
    content: `All CSC Circle member records, transactions, and event passes are stored in enterprise PostgreSQL clusters managed by Supabase, hosted in the AWS ap-south-1 (Mumbai, India) region ensuring domestic data residency. Data is encrypted at rest using AES-256 and encrypted in transit via TLS 1.3.`,
    metadata: { residency: "AWS Mumbai (ap-south-1)", encryption: "AES-256 / TLS 1.3" },
    tier: 1,
  },
  {
    source_id: "legal:grievance-officer-contact",
    category: "legal",
    title: "Grievance Officer & Legal Contact Desk",
    slug: "legal-grievance-officer-contact",
    content: `For legal concerns, DPDP Act inquiries, harassment complaints, or privacy grievances, contact the CSC Legal & Grievance Desk: Primary Technical & Security Inquiries: hello@logicintelligencetechnologies.in (CTO Vikash Saravanan). Administrative & Community Matters: coimbatorestartupcommunity@gmail.com. We acknowledge grievances within 24 hours and resolve within 7 business days.`,
    metadata: { responseTimeHours: 24, resolutionTimeDays: 7 },
    tier: 1,
  },

  // 57-64: COMMUNITY GUIDELINES, SECURITY, HELP & SUPPORT
  {
    source_id: "community:guidelines-11-core-rules",
    category: "community",
    title: "Community Guidelines: 11 Core Standards",
    slug: "community-guidelines-11-standards",
    content: `The 11 core guidelines governing CSC Circle (https://csc.logicintelligencetechnologies.in/community-guidelines): 1. Respectful & Inclusive Communication. 2. Honest Representation. 3. Virtual Google Meet Etiquette. 4. Anti-Spam & Unsolicited Sales Restrictions. 5. Member Introductions. 6. Curated Ecosystem Links. 7. Zero Cold DMs. 8. Anti-Scraping. 9. Intellectual Property Protection. 10. Authentic Event RSVP. 11. Platform Security & Ethical Disclosures.`,
    metadata: { guidelinesUrl: "https://csc.logicintelligencetechnologies.in/community-guidelines" },
    tier: 1,
  },
  {
    source_id: "community:escalation-protocol-3-stages",
    category: "community",
    title: "3-Stage Community Enforcement Protocol",
    slug: "community-enforcement-protocol",
    content: `CSC maintains a progressive 3-stage protocol for guideline infractions: Stage 1: Formal Warning & temporary discussion mute. Stage 2: 30-day suspension from all events and private channels. Stage 3: Permanent ecosystem expulsion, digital membership revocation, and public directory delisting. Severe violations (harassment, data theft) bypass Stages 1 & 2 for instant expulsion.`,
    metadata: { stages: ["Warning", "30-Day Suspension", "Permanent Expulsion"] },
    tier: 1,
  },
  {
    source_id: "security:responsible-disclosure",
    category: "security",
    title: "Responsible Vulnerability Disclosure & Safe Harbor",
    slug: "security-responsible-disclosure-policy",
    content: `Security researchers discovering vulnerabilities are invited to report them under our Safe Harbor policy at https://csc.logicintelligencetechnologies.in/security. Submit detailed proof-of-concept reports to hello@logicintelligencetechnologies.in. We commit to acknowledging within 12 hours, resolving promptly, and publicly crediting researchers in our Security Hall of Fame. Do not exfiltrate member data or disrupt live operations.`,
    metadata: { portal: "https://csc.logicintelligencetechnologies.in/security", safeHarbor: true },
    tier: 1,
  },
  {
    source_id: "security:architecture-and-encryption",
    category: "security",
    title: "Platform Infrastructure & Security Posture",
    slug: "security-platform-architecture",
    content: `The CSC Circle digital platform is built with Next.js 16 (App Router), TypeScript, and Tailwind CSS, hosted on Vercel Edge infrastructure with automatic DDoS mitigation. Background queue processing is handled by BullMQ and Upstash Redis. Database persistence is powered by Supabase PostgreSQL with Row Level Security (RLS) policies enforcing multi-tenant isolation on every table.`,
    metadata: { stack: ["Next.js 16", "Supabase PostgreSQL", "Upstash Redis", "BullMQ", "Vercel"] },
    tier: 1,
  },
  {
    source_id: "support:help-center-faq",
    category: "support",
    title: "Help Center & Frequently Asked Questions (FAQ)",
    slug: "support-help-center-faq",
    content: `Find answers to common questions at https://csc.logicintelligencetechnologies.in/help: 1. How do I join? Sign up at /signup. 2. How much does membership cost? Standard founder membership is 100% free. 3. When are meetups held? 1st & 3rd Saturdays. 4. How do I get my digital card? Visit /profile/id-card after 5-minute automated approval. 5. Who do I contact for help? Inquire on WhatsApp or email coimbatorestartupcommunity@gmail.com.`,
    metadata: { portal: "https://csc.logicintelligencetechnologies.in/help" },
    tier: 1,
  },
  {
    source_id: "support:human-escalation-protocol",
    category: "support",
    title: "WhatsApp Human Escalation & Support Ticket Desk",
    slug: "support-human-escalation-protocol",
    content: `If you need assistance from a human community manager while chatting with the CSC WhatsApp agent: reply 'HUMAN', 'SUPPORT', or 'HELP'. The system automatically creates an administrative support ticket in Supabase, notifies community organizers via email, and dispatches an instant reference ticket number (e.g. TICKET-XXXX) so an organizer can connect with you directly.`,
    metadata: { keywords: ["HUMAN", "SUPPORT", "HELP"], escalationChannel: "Admin Desk & Email Alert" },
    tier: 1,
  },
  {
    source_id: "support:official-whatsapp-group",
    category: "community",
    title: "Official WhatsApp Community Group Link & Rules",
    slug: "support-official-whatsapp-group-link",
    content: `The official Coimbatore Startup Community WhatsApp group is located at https://chat.whatsapp.com/EsMyFEUTzT0G3MpMLkUNhB?s=cl&p=a&iam=2. Group rules: 1. Introduce yourself upon joining (name, venture, focus). 2. No forward spam or promotional flyers. 3. Active engagement and peer support. 4. Strictly professional and respectful communication.`,
    metadata: { whatsappGroupUrl: CSC_COMMUNITY_CONTACTS.whatsappGroup },
    tier: 1,
  },
  {
    source_id: "support:contact-channels-directory",
    category: "support",
    title: "Comprehensive Community Contact Directory",
    slug: "support-community-contact-directory",
    content: `Official Contact Channels: 1. General & Grievance Desk: coimbatorestartupcommunity@gmail.com. 2. Engineering & Technical Support: hello@logicintelligencetechnologies.in. 3. Web Portal Contact Form: https://csc.logicintelligencetechnologies.in/contact. 4. WhatsApp Helpdesk: +91 7550067712. 5. Instagram: https://www.instagram.com/coimbatorestartupcommunity/. 6. LinkedIn: https://www.linkedin.com/in/csc-coimbatore-startup-community-b27b0b44b`,
    metadata: { contacts: CSC_COMMUNITY_CONTACTS },
    tier: 1,
  },
];

async function seedComprehensiveKnowledge() {
  const sb = getSupabase();
  console.log(`Starting comprehensive seed of ${COMPREHENSIVE_KNOWLEDGE_DOCS.length} knowledge documents...`);

  let insertedCount = 0;
  let updatedCount = 0;

  for (const doc of COMPREHENSIVE_KNOWLEDGE_DOCS) {
    const checksum = crypto.createHash("sha256").update(doc.content).digest("hex");

    const payload = {
      source: "system",
      source_id: doc.source_id,
      category: doc.category,
      title: doc.title,
      slug: doc.slug,
      content: doc.content,
      metadata: doc.metadata,
      tier: doc.tier,
      is_published: true,
      checksum,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await sb
      .from("csc_agent_knowledge_documents")
      .select("id")
      .eq("source_id", doc.source_id)
      .maybeSingle();

    if (existing) {
      const { error: updErr } = await sb
        .from("csc_agent_knowledge_documents")
        .update(payload)
        .eq("id", existing.id);

      if (updErr) {
        console.error(`Failed to update ${doc.slug}:`, updErr.message);
      } else {
        updatedCount++;
      }
    } else {
      const { error: insErr } = await sb
        .from("csc_agent_knowledge_documents")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        });

      if (insErr) {
        console.error(`Failed to insert ${doc.slug}:`, insErr.message);
      } else {
        insertedCount++;
      }
    }
  }

  console.log(`\n=============================================`);
  console.log(`KNOWLEDGE SEEDING COMPLETE!`);
  console.log(`Total Documents Configured: ${COMPREHENSIVE_KNOWLEDGE_DOCS.length}`);
  console.log(`New Insertions: ${insertedCount}`);
  console.log(`Updates: ${updatedCount}`);
  console.log(`=============================================\n`);
}

seedComprehensiveKnowledge()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal exception during seeding:", err);
    process.exit(1);
  });
