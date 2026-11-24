import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Clock,
  Mail,
  ShieldCheck,
  Lock,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Scheduled Platform Upgrade — Coimbatore Startup Community (CSC Circle)",
  description:
    "We are currently upgrading our core platform, payment reconciliation infrastructure, and founder directory to deliver a faster and more secure experience. All member accounts, verified event passes, and data remain safe.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Scheduled Platform Upgrade — Coimbatore Startup Community (CSC Circle)",
    description:
      "We are currently upgrading our core platform, payment reconciliation infrastructure, and founder directory to deliver a faster and more secure experience. All member accounts, verified event passes, and data remain safe.",
    images: [
      {
        url: "/images/og/maintenance-banner.png",
        width: 1200,
        height: 630,
        alt: "CSC Circle Scheduled Maintenance Notice & Infrastructure Upgrade",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Scheduled Platform Upgrade — Coimbatore Startup Community (CSC Circle)",
    description:
      "We are currently upgrading our core platform, payment reconciliation infrastructure, and founder directory to deliver a faster and more secure experience.",
    images: ["/images/og/maintenance-banner.png"],
  },
};

export const instant = false;

// Default locked official presets per platform governance
const DEFAULT_NOTICE = {
  title: "Scheduled Platform Upgrade in Progress",
  tamilTitle: "திட்டமிடப்பட்ட தள மேம்பாட்டுப் பணி நடைபெறுகிறது",
  message:
    "We are currently upgrading our core platform, payment reconciliation infrastructure, and founder directory to deliver a faster and more secure experience. All member accounts, verified event passes, and data remain safe. Service will be restored shortly.",
  tamilMessage:
    "எங்கள் கட்டமைப்பு, கட்டண தீர்வு முறைமை மற்றும் நிறுவனர்களின் அடைவு சேவைகளை மேலும் வேகமாகவும் பாதுகாப்பாகவும் மேம்படுத்தும் பணி நடைபெற்று வருகிறது. உங்கள் உறுப்பினர் கணக்குகள் மற்றும் நிகழ்வு அனுமதிச் சீட்டுகள் முற்றிலும் பாதுகாப்பாக உள்ளன. விரைவில் தளம் இயல்பு நிலைக்குத் திரும்பும்.",
  contactEmail: "coimbatorestartupcommunity@gmail.com",
  unlockEpochMs: null as number | null,
};

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const isAccessDenied = resolvedParams?.error === "admin_only";
  let maintenanceData = { ...DEFAULT_NOTICE };

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("content_blocks")
      .select("value")
      .eq("key", "system.website_maintenance")
      .maybeSingle();

    if (data?.value) {
      const parsed = JSON.parse(data.value);
      maintenanceData = { ...maintenanceData, ...parsed };
    }
  } catch {}

  const formattedUnlock = maintenanceData.unlockEpochMs
    ? new Date(maintenanceData.unlockEpochMs).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        day: "numeric",
        month: "short",
      }) + " IST"
    : null;

  const socialChannels = [
    {
      name: "Official WhatsApp Community",
      sub: "Founder announcements & event alerts",
      href: "https://chat.whatsapp.com/EsMyFEUTzT0G3MpMLkUNhB?s=cl&p=a&iam=2",
      icon: "/brand/social/whatsapp-circle.png",
      status: "Active",
    },
    {
      name: "24/7 AI WhatsApp Concierge",
      sub: "Instant answers for community & event passes",
      href: "https://wa.me/917550067712?text=Hi",
      icon: "/brand/social/whatsapp-agent-circle.png",
      status: "Online",
    },
    {
      name: "Official LinkedIn Network",
      sub: "Startup ecosystem spotlights & updates",
      href: "https://www.linkedin.com/in/csc-coimbatore-startup-community-b27b0b44b?utm_source=share_via&utm_content=profile&utm_medium=member_android",
      icon: "/brand/social/linkedin-circle.png",
      status: "Connected",
    },
    {
      name: "Official Instagram Stories",
      sub: "Community reels & meetup highlights",
      href: "https://www.instagram.com/coimbatorestartupcommunity/",
      icon: "/brand/social/instagram-circle.png",
      status: "Updated",
    },
    {
      name: "Priority Support Desk",
      sub: maintenanceData.contactEmail,
      href: `mailto:${maintenanceData.contactEmail}`,
      icon: "/brand/social/email-circle.png",
      status: "24/7 Monitored",
    },
  ];

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden lg:h-screen lg:max-h-screen lg:overflow-hidden bg-[#0A0D14] text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background Ambient Glows (Contained to eliminate mobile horizontal scroll error) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 sm:left-1/3 w-[340px] sm:w-[700px] h-[350px] bg-gradient-to-b from-indigo-600/20 via-emerald-600/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-1/2 translate-x-1/2 sm:translate-x-0 sm:right-1/4 w-[300px] sm:w-[600px] h-[300px] bg-gradient-to-t from-purple-600/15 to-transparent blur-3xl" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 flex items-center justify-between max-w-7xl mx-auto w-full pb-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative size-10 rounded-xl overflow-hidden bg-white/5 ring-1 ring-white/15 p-1 flex items-center justify-center shrink-0 shadow-md">
            <Image
              src="/brand/csc-icon.png"
              alt="CSC Circle Logo"
              width={36}
              height={36}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <span className="text-sm font-extrabold tracking-tight text-white block">
              Coimbatore Startup Community
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              CSC Circle · System Maintenance Gateway
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wide">
            <span className="size-2 rounded-full bg-amber-400 animate-ping" />
            HTTP 503 · Scheduled Upgrade Window
          </span>
        </div>
      </header>

      {/* Main Two-Column Container */}
      <div className="relative z-10 max-w-7xl mx-auto w-full my-auto py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
        {/* Left Column: Official Notice & Leadership Assurance */}
        <div className="lg:col-span-7 space-y-5 text-left">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-bold">
            <Sparkles className="size-3.5 text-indigo-400" />
            <span>Platform Enhancement in Progress</span>
          </div>

          {/* Bilingual Headlines */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              {maintenanceData.title}
            </h1>
            <p className="text-sm sm:text-base font-semibold text-emerald-400/90 font-sans">
              {maintenanceData.tamilTitle}
            </p>
          </div>

          {/* Access Denied Alert if non-admin attempted sign in */}
          {isAccessDenied && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-3 backdrop-blur-md">
              <ShieldCheck className="size-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-100 text-xs">
                  Administrator Verification Required
                </p>
                <p className="text-[11px] text-rose-200/90 leading-relaxed mt-1">
                  The platform is currently locked for scheduled maintenance. Member sign-ins and profile portals are temporarily paused. Only verified system administrators can sign in at this time.
                </p>
              </div>
            </div>
          )}

          {/* Official Bilingual Notice Card */}
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-4">
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {maintenanceData.message}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed border-t border-white/10 pt-3">
              {maintenanceData.tamilMessage}
            </p>

            {formattedUnlock && (
              <div className="mt-3 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-xs font-semibold text-indigo-200">
                <Clock className="size-4 text-indigo-400 shrink-0" />
                <span>
                  Target Return Time: <strong className="text-white">{formattedUnlock}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Zero Data Loss & Security Assurance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span className="text-xs text-slate-300 font-medium">
                Passes &amp; Accounts 100% Safe
              </span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <ShieldCheck className="size-4 text-indigo-400 shrink-0" />
              <span className="text-xs text-slate-300 font-medium">
                Encrypted Transaction Ledgers
              </span>
            </div>
          </div>

          {/* Admin Sign In */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
            <Link
              href="/login?next=%2Fadmin"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 text-xs font-black transition-all shadow-md shrink-0"
            >
              <Lock className="size-3.5" />
              <span>Admin Sign In</span>
              <ArrowRight className="size-3.5" />
            </Link>
            <span className="text-[11px] text-slate-400 leading-snug">
              Platform is in maintenance mode. Only verified system administrators can sign in.
            </span>
          </div>
        </div>

        {/* Right Column: 4:5 Aspect Ratio Official Communication Card */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="aspect-[4/5] w-full max-w-[340px] sm:max-w-[360px] p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950/90 border border-white/10 shadow-2xl backdrop-blur-2xl flex flex-col justify-between relative overflow-hidden">
            {/* Top Accent Pill */}
            <div>
              <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-white/10">
                <span className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <MessageSquare className="size-3.5 text-emerald-400" />
                  Official Circles
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  100% Operational
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 leading-tight">
                Our social network, WhatsApp AI assistant, and help desk remain live during this upgrade.
              </p>
            </div>

            {/* 5 Channels Stack */}
            <div className="space-y-1.5 sm:space-y-2 py-1 sm:py-2">
              {socialChannels.map((channel) => (
                <a
                  key={channel.name}
                  href={channel.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-1.5 sm:p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition-all group"
                >
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <div className="size-6 sm:size-7 rounded-full overflow-hidden shrink-0 border border-white/20 bg-white/10 flex items-center justify-center">
                      <Image
                        src={channel.icon}
                        alt={channel.name}
                        width={28}
                        height={28}
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] sm:text-xs font-bold text-white group-hover:text-emerald-400 transition truncate">
                        {channel.name}
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-slate-400 truncate">
                        {channel.sub}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="size-3 text-slate-500 group-hover:text-white transition shrink-0 ml-1.5" />
                </a>
              ))}
            </div>

            {/* Bottom LIT Security Badge */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-indigo-400" />
                256-Bit SSL Protection
              </span>
              <span className="font-mono text-[10px] text-emerald-400 font-semibold">
                SLA: 99.98%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer: Compact 2-line layout on mobile, full horizontal row on desktop */}
      <footer className="relative z-10 pt-3 pb-1 sm:pb-0 border-t border-white/5 max-w-7xl mx-auto w-full flex flex-col sm:flex-row justify-between items-center gap-1 sm:gap-3 text-center sm:text-left shrink-0">
        <span className="text-[10px] sm:text-xs leading-tight text-slate-400">
          &copy; {new Date().getFullYear()} Coimbatore Startup Community (CSC Circle) · All rights reserved.
        </span>

        {/* Official Technical Partner Badge with Circular LIT Emblem (Scaled for Mobile) */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs text-slate-400 leading-tight">
          <span>Secured &amp; Architected by</span>
          <div className="size-3.5 sm:size-5 rounded-full overflow-hidden bg-white shrink-0 shadow-xs border border-white/30 flex items-center justify-center">
            <Image
              src="/brand/technical-partner-lit.png"
              alt="Logic Intelligence Technologies"
              width={20}
              height={20}
              className="object-cover"
            />
          </div>
          <span className="font-bold text-slate-200">
            Logic Intelligence Technologies
          </span>
        </div>
      </footer>
    </main>
  );
}
