import type { Metadata } from "next";
import { Container } from "@/components/common/container";
import { Eyebrow } from "@/components/common/section";
import { Wrench, Clock, Mail, ShieldAlert, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Under Scheduled Maintenance — Coimbatore Startup Community",
  description: "Coimbatore Startup Community platform is undergoing scheduled enhancements.",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function MaintenancePage() {
  let maintenanceData = {
    title: "We will be right back!",
    tamilTitle: "விரைவில் மீண்டும் வருகிறோம்!",
    message: "Coimbatore Startup Community platform is undergoing scheduled enhancements to serve our founder network better. We will be back online shortly.",
    tamilMessage: "எங்கள் நிறுவனர் தளத்தை மேலும் மேம்படுத்த தளம் தற்போது பராமரிப்பில் உள்ளது. விரைவில் மீண்டும் இயங்கும்.",
    contactEmail: "coimbatorestartupcommunity@gmail.com",
    unlockEpochMs: null as number | null,
  };

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

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent blur-3xl pointer-events-none" />

      {/* Header Logo */}
      <header className="relative z-10 flex items-center justify-between max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center font-bold tracking-tight text-white text-sm">
            CSC
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight block">Coimbatore Startup Community</span>
            <span className="text-[10px] text-slate-400 font-mono">Platform Maintenance Gateway</span>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
          <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
          Scheduled Maintenance
        </span>
      </header>

      {/* Main Content Box */}
      <div className="relative z-10 max-w-2xl mx-auto w-full my-auto py-12 text-center space-y-6">
        <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400 mb-2 shadow-inner">
          <Wrench className="size-8 text-indigo-300 animate-bounce duration-1000" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {maintenanceData.title}
          </h1>
          <p className="text-base sm:text-lg font-medium text-indigo-300">
            {maintenanceData.tamilTitle}
          </p>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md text-left space-y-4 shadow-xl">
          <p className="text-sm text-slate-300 leading-relaxed">
            {maintenanceData.message}
          </p>

          <p className="text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-3">
            {maintenanceData.tamilMessage}
          </p>

          {formattedUnlock && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-950/50 border border-indigo-500/20 text-xs font-medium text-indigo-200">
              <Clock className="size-4 text-indigo-400 shrink-0" />
              <span>Expected return time: <strong>{formattedUnlock}</strong></span>
            </div>
          )}
        </div>

        {/* Contact Support */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Mail className="size-3.5 text-slate-400" />
            Urgent inquiries: <a href={`mailto:${maintenanceData.contactEmail}`} className="text-indigo-400 hover:underline">{maintenanceData.contactEmail}</a>
          </span>
          <span className="hidden sm:inline">•</span>
          <Link href="/login" className="text-slate-500 hover:text-slate-300 transition underline underline-offset-4">
            Organizer Sign In
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs text-slate-500 border-t border-white/5 pt-6 max-w-4xl mx-auto w-full flex flex-col sm:flex-row justify-between items-center gap-2">
        <span>© {new Date().getFullYear()} Coimbatore Startup Community (CSC Circle). All rights reserved.</span>
        <span>Secured by Logic Intelligence Technologies</span>
      </footer>
    </main>
  );
}
