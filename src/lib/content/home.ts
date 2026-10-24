/**
 * Approved copy for the Home page. Icons are referenced by lucide name and
 * resolved in the component layer so this module stays framework-free.
 */

export const homeHero = {
  eyebrow: "COIMBATORE STARTUP COMMUNITY",
  headline: "Great Ideas Grow in the Right Circle.",
  statement: "Connect. Build. Grow.",
  description:
    "CSC Circle brings Coimbatore's founders, builders, creators, and future entrepreneurs together. Discover the right people, exchange ideas, and find opportunities to turn ambition into action.",
  primaryCta: { label: "Join the Community", href: "/login" },
  secondaryCta: { label: "Upcoming Events", href: "/events" },
};

export const statsSection = {
  title: "Building Connections. Creating Opportunities.",
  description:
    "CSC Circle is growing deliberately — founder by founder, startup by startup. Here is what the community is building toward.",
};

export const whyJoin = {
  heading: "Everything Starts With the Right Connections.",
  description:
    "CSC Circle is built around four ways to move your startup journey forward.",
  cards: [
    {
      icon: "Users",
      title: "Meaningful Networking",
      body: "Meet founders, technical professionals, creators, marketers, and ambitious builders who share your determination to create something valuable.",
      surface: "purple",
    },
    {
      icon: "Presentation",
      title: "Pitch Sessions & Meetups",
      body: "Share your startup ideas, exchange practical feedback, and discover the people who can help move your vision forward.",
      surface: "blue",
    },
    {
      icon: "GraduationCap",
      title: "Mentorship & Learning",
      body: "Learn from entrepreneurial experiences, explore new perspectives, and grow alongside a community that values knowledge-sharing.",
      surface: "pink",
    },
    {
      icon: "Cpu",
      title: "Technology & Infrastructure",
      body: "Explore technical guidance, digital infrastructure support, and collaboration opportunities that can help startups build strong foundations.",
      surface: "gold",
    },
  ],
} as const;

export const howItWorks = {
  heading: "Your Journey Starts With One Connection.",
  description:
    "Three simple steps take you from joining the circle to turning connections into momentum.",
  steps: [
    {
      icon: "UserPlus",
      title: "Connect",
      body: "Join the community and meet relevant people — founders, builders, and partners from across Coimbatore.",
    },
    {
      icon: "MessagesSquare",
      title: "Collaborate",
      body: "Share ideas, discover partners, and participate in conversations that sharpen and strengthen your startup.",
    },
    {
      icon: "TrendingUp",
      title: "Grow",
      body: "Turn new insights and connections into actionable progress for your idea, product, and team.",
    },
  ],
} as const;

export const founderPreview = {
  heading: "Meet the Builders Behind the Ideas.",
  description:
    "A look at the founders and startups shaping Coimbatore's next chapter.",
  cta: { label: "Explore Founder Directory", href: "/directory" },
};

export const upcomingEventsSection = {
  heading: "Where Conversations Become Opportunities.",
  description:
    "Meetups, pitch sessions and workshops designed to help you connect with the right people.",
  emptyTitle: "The Next CSC Gathering Is in the Works.",
  emptyBody:
    "Join the community to hear about upcoming opportunities to connect and collaborate.",
  cta: { label: "View All Events", href: "/events" },
};

export const memberExperience = {
  heading: "Your Community, Always Within Reach.",
  description:
    "CSC membership brings your account, profile, digital membership card, and event registration together in one place. Create an account to get started.",
  cards: [
    {
      icon: "IdCard",
      title: "Digital CSC Membership",
      body: "A digital membership card representing your place in the community, available in your account once your membership is approved.",
    },
    {
      icon: "UserCircle",
      title: "Founder Profile",
      body: "A profile to share your startup, skills and collaboration interests with the community.",
    },
    {
      icon: "CalendarCheck",
      title: "Event Registrations",
      body: "Register for meetups and pitch sessions, and track your registration status and event passes.",
    },
    {
      icon: "Network",
      title: "Community Connections",
      body: "Discover and connect with founders and partners who match what you're building.",
    },
  ],
  cta: { label: "Discover CSC Membership", href: "/login" },
} as const;

export const finalCta = {
  headline: "Your Next Big Opportunity Could Start With One Conversation.",
  body: "Connect with founders, discover collaborative opportunities, and take your next step with CSC Circle.",
  cta: { label: "Become Part of CSC Circle", href: "/login" },
};
