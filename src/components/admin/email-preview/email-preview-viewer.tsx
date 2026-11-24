"use client";

import * as React from "react";
import { renderMerakiEditorialEmail } from "@/lib/notifications/template-meraki";
import { renderNomuShowcaseEmail, type NomuThemeVariant } from "@/lib/notifications/template-nomu";
import { CSC_7_LEADERS } from "@/lib/notifications/email-components";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Send,
  Eye,
  Sparkles,
  Smartphone,
  Monitor,
  CheckCircle2,
  Users,
  ShieldCheck,
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
  const [selectedTemplate, setSelectedTemplate] = React.useState<"meraki" | "nomu">("meraki");
  const [nomuVariant, setNomuVariant] = React.useState<NomuThemeVariant>("blue");
  const [scenario, setScenario] = React.useState<"welcome" | "pass" | "admin" | "security">("welcome");
  const [viewMode, setViewMode] = React.useState<"desktop" | "mobile">("desktop");
  const [sending, setSending] = React.useState(false);
  const [sendResult, setSendResult] = React.useState<{ ok: boolean; message: string } | null>(null);

  const renderedHtml = React.useMemo(() => {
    if (selectedTemplate === "meraki") {
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
        });
      } else if (scenario === "admin") {
        return renderMerakiEditorialEmail({
          base: baseUrl,
          support: supportEmail,
          badgeText: "CSC ADMINISTRATIVE INVITATION",
          headline: "Administrator Invitation",
          headlineItalic: "Event Operations Lead",
          greeting: "Hello Admin,",
          body: "You have been invited to join the Coimbatore Startup Community administration team. Your role includes attendee check-in and event session moderation.",
          buttonText: "Accept Invitation",
          buttonUrl: `${baseUrl}/admin`,
          thumbtackNote: "High trust, zero noise, high operational excellence.",
        });
      } else {
        return renderMerakiEditorialEmail({
          base: baseUrl,
          support: supportEmail,
          headline: "Your CSC Startup Listing is Approved",
          headlineItalic: "Coimbatore Founder Directory",
          greeting: "Hello Founder,",
          body: "Great news! Your startup submission has been verified by the CSC core committee and is now featured live in the Coimbatore Startup Directory.",
          buttonText: "View Directory Listing",
          buttonUrl: `${baseUrl}/directory`,
        });
      }
    } else {
      // Nomu Showcase
      if (scenario === "pass") {
        const qrSvg = `<div style="margin:20px auto;padding:18px;max-width:440px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:18px;text-align:center;"><div style="display:inline-block;padding:4px 12px;background:#CCFBF1;color:#0F766E;font-size:11px;font-weight:800;border-radius:999px;margin-bottom:10px;">VERIFIED ADMISSION PASS</div><h3 style="margin:0 0 6px;color:#1E293B;font-size:16px;font-weight:800;">Your individual event pass QR</h3><p style="margin:0 0 14px;color:#64748B;font-size:12px;">Scan at the entrance registration desk or check in online.</p><div style="padding:12px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;display:inline-block;margin:0 auto 14px;"><img src="${baseUrl}/brand/csc-icon.png" width="180" height="180" alt="Pass QR" style="display:block;margin:0 auto;border-radius:12px;" /></div></div>`;
        return renderNomuShowcaseEmail({
          base: baseUrl,
          support: supportEmail,
          variant: nomuVariant,
          mainTitle: "Registration Confirmed",
          subtitle: "CSC Connect Edition · Coimbatore Innovation Hub",
          greeting: "Hello Asha Rao,",
          body: "Your seat for CSC Connect Edition has been confirmed. Review your individual entry QR pass below and present it on your mobile upon arrival.",
          qrCodeMarkup: qrSvg,
          primaryButtonText: "View Pass on Your Profile",
          primaryButtonUrl: `${baseUrl}/profile/events`,
        });
      } else if (scenario === "security") {
        const codeBox = `<div style="background-color:#F1F5F9;border-radius:16px;border:2px dashed #94A3B8;padding:22px;text-align:center;margin:22px 0;"><span style="font-family:monospace;font-size:36px;font-weight:900;letter-spacing:10px;color:#0F172A;display:block;">749201</span><span style="display:block;font-size:12px;color:#64748B;margin-top:8px;font-weight:600;">Valid for 10 minutes · Single-use authorization code</span></div>`;
        return renderNomuShowcaseEmail({
          base: baseUrl,
          support: supportEmail,
          variant: nomuVariant,
          mainTitle: "Security Verification",
          subtitle: "Password Update Authorization · CSC Account Security",
          greeting: "Hello Member,",
          body: "You requested to update your account password on CSC Circle. Use the 6-digit security verification code below to authorize this change:",
          customMarkup: codeBox,
          primaryButtonText: "Sign In to CSC Circle",
          primaryButtonUrl: `${baseUrl}/login`,
        });
      } else {
        return renderNomuShowcaseEmail({
          base: baseUrl,
          support: supportEmail,
          variant: nomuVariant,
          mainTitle: "Digital ID Card Ready",
          subtitle: "Coimbatore Startup Community · Verified Member Credential",
          greeting: "Hello Founder,",
          body: "Your free CSC membership claim has been approved. You can view, save, and download your official digital member ID card directly on your profile.",
          primaryButtonText: "Download Digital ID Card",
          primaryButtonUrl: `${baseUrl}/profile/id-card`,
          featureTitle: "Membership Privileges",
          featureItems: [
            { title: "Direct Cohort Access", description: "Engage in peer roundtables with funded founders.", badge: "Verified" },
            { title: "Exclusive Event Passes", description: "Early admission access to offline meetups.", badge: "Free" },
            { title: "Founder Directory", description: "Showcase your venture to angel investors.", badge: "Spotlight" },
          ],
        });
      }
    }
  }, [selectedTemplate, nomuVariant, scenario, baseUrl, supportEmail]);

  const handleSendTestEmail = async () => {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/email-preview/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: adminEmail,
          subject: `[CSC Test] ${selectedTemplate === "meraki" ? "Meraki Editorial" : "Nomu Showcase"} Preview`,
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
              <Mail className="w-5 h-5 text-indigo-600" />
              Live Email Template Studio
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Exact replica of user-approved Meraki & Nomu designs · All 7 Leaders Embedded
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={selectedTemplate === "meraki" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTemplate("meraki")}
              className="font-bold text-xs"
            >
              Template A: Meraki Editorial
            </Button>
            <Button
              variant={selectedTemplate === "nomu" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTemplate("nomu")}
              className="font-bold text-xs"
            >
              Template B: Nomu Showcase
            </Button>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Scenario:</span>
            <Button
              variant={scenario === "welcome" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setScenario("welcome")}
              className="text-xs h-7 px-2.5 font-semibold"
            >
              Welcome / Member
            </Button>
            <Button
              variant={scenario === "pass" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setScenario("pass");
                if (selectedTemplate === "meraki") setSelectedTemplate("nomu");
              }}
              className="text-xs h-7 px-2.5 font-semibold"
            >
              Event Pass QR
            </Button>
            <Button
              variant={scenario === "admin" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setScenario("admin");
                if (selectedTemplate === "nomu") setSelectedTemplate("meraki");
              }}
              className="text-xs h-7 px-2.5 font-semibold"
            >
              Admin Invite
            </Button>
            <Button
              variant={scenario === "security" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setScenario("security");
                if (selectedTemplate === "meraki") setSelectedTemplate("nomu");
              }}
              className="text-xs h-7 px-2.5 font-semibold"
            >
              Security OTP
            </Button>

            {selectedTemplate === "nomu" && (
              <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Palette:</span>
                <button
                  type="button"
                  onClick={() => setNomuVariant("blue")}
                  className={`w-5 h-5 rounded-full bg-[#8B9FD8] border-2 ${nomuVariant === "blue" ? "border-slate-900 ring-2 ring-indigo-400" : "border-transparent"}`}
                  title="Lavender Blue"
                />
                <button
                  type="button"
                  onClick={() => setNomuVariant("sand")}
                  className={`w-5 h-5 rounded-full bg-[#E3DACB] border-2 ${nomuVariant === "sand" ? "border-slate-900 ring-2 ring-amber-400" : "border-transparent"}`}
                  title="Warm Sand Clay"
                />
                <button
                  type="button"
                  onClick={() => setNomuVariant("green")}
                  className={`w-5 h-5 rounded-full bg-[#1C6B38] border-2 ${nomuVariant === "green" ? "border-slate-900 ring-2 ring-emerald-400" : "border-transparent"}`}
                  title="Matcha Forest Green"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setViewMode("desktop")}
                className={`p-1.5 rounded-md ${viewMode === "desktop" ? "bg-white dark:bg-slate-700 shadow-xs text-indigo-600" : "text-slate-500"}`}
                title="Desktop View"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("mobile")}
                className={`p-1.5 rounded-md ${viewMode === "mobile" ? "bg-white dark:bg-slate-700 shadow-xs text-indigo-600" : "text-slate-500"}`}
                title="Mobile View"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleSendTestEmail}
              disabled={sending}
              className="text-xs font-bold gap-1.5 border-indigo-200 hover:border-indigo-300 text-indigo-700 dark:text-indigo-400"
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

      {/* Leadership Roster Audit Pill */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Leadership &amp; Team (All 7 Members Verified Embedded)
            </h4>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
            7 / 7 Active
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {CSC_7_LEADERS.map((leader) => (
            <div
              key={leader.name}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-center shadow-xs"
            >
              <div className="w-10 h-10 mx-auto mb-1.5 rounded-full overflow-hidden border border-slate-200 bg-slate-100">
                <img
                  src={leader.portrait}
                  alt={leader.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                {leader.name}
              </p>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                {leader.role}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Live Preview Iframe Container */}
      <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex justify-center items-start min-h-[700px] overflow-x-auto">
        <div
          style={{
            width: viewMode === "desktop" ? "640px" : "390px",
            transition: "width 0.3s ease-in-out",
          }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        >
          <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <span className="font-mono text-[11px] text-slate-400">
              {selectedTemplate === "meraki" ? "template-meraki.html" : `template-nomu-${nomuVariant}.html`}
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400">{viewMode}</span>
          </div>

          <iframe
            srcDoc={renderedHtml}
            title="Email Live Preview"
            className="w-full min-h-[900px] border-0"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
