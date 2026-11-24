"use client";

import * as React from "react";
import { renderMerakiEditorialEmail } from "@/lib/notifications/template-meraki";
import { CSC_7_LEADERS } from "@/lib/notifications/email-components";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Send,
  Smartphone,
  Monitor,
  CheckCircle2,
  Users,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export function EmailPreviewViewer({
  baseUrl,
  supportEmail,
  adminEmail,
}: {
  baseUrl: string;
  supportEmail: string;
  adminEmail: string;
}) {
  const [scenario, setScenario] = React.useState<"welcome" | "pass" | "idcard" | "admin" | "security">("welcome");
  const [viewMode, setViewMode] = React.useState<"desktop" | "mobile">("desktop");
  const [sending, setSending] = React.useState(false);
  const [sendResult, setSendResult] = React.useState<{ ok: boolean; message: string } | null>(null);

  const renderedHtml = React.useMemo(() => {
    if (scenario === "welcome") {
      return renderMerakiEditorialEmail({
        base: baseUrl,
        support: supportEmail,
        headline: "Welcome to Coimbatore Startup Community",
        headlineItalic: "Building Coimbatore's Leading Founder Cohort",
        greeting: "Hello Founder,",
        body: "Welcome to Coimbatore Startup Community. You are now part of our growing ecosystem of innovators, manufacturers, and technology creators building the future from Coimbatore.\n\nExplore upcoming events, connect with mentors, and share what you are building with our cohort.",
        buttonText: "Explore CSC Community Hub",
        buttonUrl: `${baseUrl}/events`,
        thumbtackNote: "Consistency matters more than frequency in early ventures.",
      });
    } else if (scenario === "pass") {
      const passQr = `
        <div style="margin:22px auto;padding:20px 16px;max-width:440px;border:1px solid #E2E8F0;border-radius:18px;background:#F8FAFC;text-align:center;box-sizing:border-box;">
          <div style="display:inline-block;padding:4px 12px;background:#CCFBF1;color:#0F766E;font-size:11px;font-weight:800;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;">
            Official Digital Event Pass
          </div>
          <h3 style="margin:0 0 8px;color:#1E293B;font-size:16px;font-weight:800;">
            Your individual event pass QR
          </h3>
          <p style="margin:0 0 14px;color:#64748B;font-size:12px;line-height:18px;">
            Your verified digital event pass is ready. You can view, save, and download it directly from your Profile on the website.
          </p>
          <div style="padding:12px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;display:inline-block;margin:0 auto 16px;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
            <img src="${baseUrl}/brand/csc-icon.png" width="180" height="180" alt="Pass QR" style="display:block;margin:0 auto;border-radius:12px;" />
          </div>
          <div style="text-align:left;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:14px 16px;margin-bottom:14px;">
            <p style="margin:0 0 6px;color:#1E293B;font-size:12px;font-weight:800;">Check-in &amp; Admission:</p>
            <p style="margin:0;color:#64748B;font-size:11px;line-height:18px;">
              Present this verified digital QR pass on your mobile device at the entrance desk for instant check-in.
            </p>
          </div>
        </div>
      `;
      return renderMerakiEditorialEmail({
        base: baseUrl,
        support: supportEmail,
        headline: "Your Event Registration Is Confirmed",
        headlineItalic: "CSC Connect Edition · Coimbatore Innovation Hub",
        greeting: "Hello Asha Rao,",
        body: "Your seat for CSC Connect Edition has been confirmed. Review your individual admission pass below and present it on your mobile upon arrival.",
        customMarkup: passQr,
        buttonText: "View Pass on Your Profile",
        buttonUrl: `${baseUrl}/profile/events`,
        thumbtackNote: "Your seat is confirmed. Download your verified pass on your profile.",
      });
    } else if (scenario === "idcard") {
      return renderMerakiEditorialEmail({
        base: baseUrl,
        support: supportEmail,
        headline: "Your CSC Membership Card Is Ready",
        headlineItalic: "Verified Member Credential",
        greeting: "Hello Founder,",
        body: "Your free CSC membership claim has been approved by the community committee. You can view, save, and download your official digital membership card directly on your profile.",
        buttonText: "Download Digital ID Card",
        buttonUrl: `${baseUrl}/profile/id-card`,
        thumbtackNote: "Membership is 100% free. Access cohort roundtables and private founder meetups.",
      });
    } else if (scenario === "admin") {
      const inviteMarkup = `
        <div style="margin:18px 0 20px;padding:16px 16px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:16px;text-align:left;box-sizing:border-box;">
          <p style="margin:0 0 10px;font-size:10px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#475569;">
            Assigned Permissions (Event Operations Lead)
          </p>
          <p style="margin:0 0 6px;font-size:11px;color:#1E293B;font-weight:700;">✦ Scan &amp; check in attendees</p>
          <p style="margin:0 0 6px;font-size:11px;color:#1E293B;font-weight:700;">✦ View verified registrations</p>
          <p style="margin:0;font-size:11px;color:#1E293B;font-weight:700;">✦ Moderate event QA &amp; discussions</p>
        </div>
      `;
      return renderMerakiEditorialEmail({
        base: baseUrl,
        support: supportEmail,
        badgeText: "CSC ADMINISTRATIVE INVITATION",
        headline: "Administrator Invitation",
        headlineItalic: "Event Operations Lead",
        greeting: "Hello Admin,",
        body: "You have been invited to join the Coimbatore Startup Community administration team as Event Operations Lead.",
        customMarkup: inviteMarkup,
        buttonText: "Accept Invitation",
        buttonUrl: `${baseUrl}/admin`,
        thumbtackNote: "High trust, zero noise, high operational excellence.",
      });
    } else {
      // Security OTP
      const codeBox = `
        <div style="background-color: #FAF8F5; border-radius: 16px; border: 2px dashed #94A3B8; padding: 22px 16px; text-align: center; margin: 20px 0; box-sizing: border-box;">
          <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #0F172A; display: block;">
            749201
          </span>
          <span style="display: block; font-size: 11px; color: #64748B; margin-top: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
            Valid for 10 minutes · Single-use authorization code
          </span>
        </div>
      `;
      return renderMerakiEditorialEmail({
        base: baseUrl,
        support: supportEmail,
        badgeText: "CSC ACCOUNT SECURITY",
        headline: "Security Verification Code",
        headlineItalic: "Authorized Account Protection",
        greeting: "Hello Member,",
        body: "You requested to update your account password on CSC Circle. Use the 6-digit security verification code below to authorize this change:",
        customMarkup: codeBox,
        buttonText: "Sign In to CSC Circle",
        buttonUrl: `${baseUrl}/login`,
        thumbtackNote: "Keep your credentials secure. Never share your verification code.",
      });
    }
  }, [scenario, baseUrl, supportEmail]);

  const handleSendTestEmail = async () => {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/email-preview/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: adminEmail,
          subject: `[CSC Test] MERAKI Editor Preview (${scenario})`,
          html: renderedHtml,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSendResult({ ok: true, message: `Test email successfully dispatched to ${adminEmail}` });
      } else {
        setSendResult({ ok: false, message: data.error || "Failed to dispatch test email" });
      }
    } catch (err: unknown) {
      setSendResult({ ok: false, message: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controller Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-emerald-600" />
              Master MERAKI Editor Studio
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              100% Platform Standard · 3+4 Executive Leadership Split · Logic Intelligence Technologies Partner Badge
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              MERAKI Master Standard Active
            </span>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Scenario:</span>
            <Button
              variant={scenario === "welcome" ? "default" : "outline"}
              size="sm"
              onClick={() => setScenario("welcome")}
              className="text-xs h-7 px-3 font-semibold"
            >
              Welcome / Member
            </Button>
            <Button
              variant={scenario === "pass" ? "default" : "outline"}
              size="sm"
              onClick={() => setScenario("pass")}
              className="text-xs h-7 px-3 font-semibold"
            >
              Event Pass QR
            </Button>
            <Button
              variant={scenario === "idcard" ? "default" : "outline"}
              size="sm"
              onClick={() => setScenario("idcard")}
              className="text-xs h-7 px-3 font-semibold"
            >
              Digital ID Card
            </Button>
            <Button
              variant={scenario === "admin" ? "default" : "outline"}
              size="sm"
              onClick={() => setScenario("admin")}
              className="text-xs h-7 px-3 font-semibold"
            >
              Admin Invite
            </Button>
            <Button
              variant={scenario === "security" ? "default" : "outline"}
              size="sm"
              onClick={() => setScenario("security")}
              className="text-xs h-7 px-3 font-semibold"
            >
              Security OTP
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewport Switcher */}
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setViewMode("desktop")}
                className={`p-1.5 rounded-md flex items-center gap-1 text-xs font-bold ${
                  viewMode === "desktop"
                    ? "bg-white dark:bg-slate-700 shadow-xs text-emerald-700 dark:text-emerald-400"
                    : "text-slate-500"
                }`}
                title="Desktop View (640px)"
              >
                <Monitor className="w-4 h-4" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("mobile")}
                className={`p-1.5 rounded-md flex items-center gap-1 text-xs font-bold ${
                  viewMode === "mobile"
                    ? "bg-white dark:bg-slate-700 shadow-xs text-emerald-700 dark:text-emerald-400"
                    : "text-slate-500"
                }`}
                title="Mobile View (375px)"
              >
                <Smartphone className="w-4 h-4" />
                <span>Mobile (Zero Overflow)</span>
              </button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleSendTestEmail}
              disabled={sending}
              className="text-xs font-bold gap-1.5 border-emerald-300 hover:border-emerald-400 text-emerald-800 dark:text-emerald-300"
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? "Sending..." : "Send Test to Me"}
            </Button>
          </div>
        </div>

        {sendResult && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              sendResult.ok
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {sendResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            {sendResult.message}
          </div>
        )}
      </div>

      {/* 3 + 4 Leadership Layout Visual Audit */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Guided by Coimbatore Startup Community Core Leadership (All 7 Members)
            </h4>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
            3 Top + 4 Bottom
          </span>
        </div>

        {/* Top 3 Leaders */}
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          Top Row (Founder, Co-Founder, CEO)
        </p>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {CSC_7_LEADERS.slice(0, 3).map((leader) => (
            <div
              key={leader.name}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-center shadow-xs"
            >
              <div className="w-10 h-10 mx-auto mb-1 rounded-full overflow-hidden border-2 border-emerald-600 bg-slate-100">
                <img src={leader.portrait} alt={leader.name} className="w-full h-full object-cover" />
              </div>
              <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{leader.name}</p>
              <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase truncate">{leader.role}</p>
            </div>
          ))}
        </div>

        {/* Bottom 4 Leaders */}
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          Bottom Row (CTO, CCO, COO, CBO)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CSC_7_LEADERS.slice(3, 7).map((leader) => (
            <div
              key={leader.name}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-center shadow-xs"
            >
              <div className="w-10 h-10 mx-auto mb-1 rounded-full overflow-hidden border-2 border-emerald-600 bg-slate-100">
                <img src={leader.portrait} alt={leader.name} className="w-full h-full object-cover" />
              </div>
              <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{leader.name}</p>
              <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase truncate">{leader.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Live Responsive Iframe Container */}
      <div className="bg-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 flex justify-center items-start min-h-[750px] overflow-x-auto">
        <div
          style={{
            width: viewMode === "desktop" ? "620px" : "375px",
            transition: "width 0.25s ease-in-out",
          }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden"
        >
          {/* Iframe Top Bar */}
          <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <span className="font-mono text-[11px] text-slate-400">
              template-meraki-master.html
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400">
              {viewMode === "desktop" ? "Desktop (620px)" : "Mobile (375px)"}
            </span>
          </div>

          <iframe
            srcDoc={renderedHtml}
            title="Email Live Preview"
            className="w-full min-h-[960px] border-0"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
