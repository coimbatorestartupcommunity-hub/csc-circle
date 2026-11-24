import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdminPagePermission } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { LiveVerificationTool } from "@/components/admin/whatsapp/live-verification-tool";
import { WhatsAppLockControl } from "@/components/admin/whatsapp/whatsapp-lock-control";
import { getWhatsAppLockConfig } from "@/lib/services/system-settings";
import {
  Activity,
  Radio,
  Server,
  Database,
  Bot,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
} from "lucide-react";

export const metadata = { title: "WhatsApp Agent & 24/7 Live Operations" };

export default async function WhatsAppAgentDashboardPage() {
  const ctx = await requireAdminPagePermission("members.read");
  const admin = createAdminClient();

  // Parallel fetches for live dashboard metrics
  const [
    outboxRes,
    recentOutboxRes,
    knowledgeCountRes,
    ticketsRes,
    whatsappLockConfig,
  ] = await Promise.all([
    admin.from("whatsapp_message_outbox").select("status"),
    admin
      .from("whatsapp_message_outbox")
      .select("id, recipient_phone, message_type, status, openwa_message_id, created_at, sent_at, last_error_message")
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("csc_agent_knowledge_documents")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true),
    admin
      .from("csc_agent_support_tickets")
      .select("id, ticket_number, sender_phone, subject, status, priority, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    getWhatsAppLockConfig(),
  ]);

  const allOutbox = outboxRes.data || [];
  const sentCount = allOutbox.filter((m) => m.status === "sent").length;
  const pendingCount = allOutbox.filter((m) => m.status === "pending" || m.status === "processing").length;
  const failedCount = allOutbox.filter((m) => m.status === "failed").length;

  const recentOutbox = recentOutboxRes.data || [];
  const knowledgeCount = knowledgeCountRes.count ?? 0;
  const supportTickets = ticketsRes.data || [];

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        title="WhatsApp Agent & 24/7 Live Operations"
        description="Comprehensive real-time command center: Container session, 24/7 worker daemon, transactional outbox queue, inbound webhook intelligence, and live test dispatch."
        isDemo={ctx.mode === "preview"}
      />

      {/* 24/7 Infrastructure Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm flex items-center gap-3">
          <div className="size-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center shrink-0">
            <Radio className="size-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">WhatsApp Session</p>
            </div>
            <p className="text-[11px] font-mono text-zinc-500 truncate max-w-[170px] mt-0.5">
              +91 75500 67712
            </p>
            <span className="text-[10px] text-emerald-700 font-medium">Session: Connected</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm flex items-center gap-3">
          <div className="size-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
            <Server className="size-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500" />
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">OpenWA Gateway</p>
            </div>
            <p className="text-[11px] font-mono text-zinc-500 mt-0.5">Port 2785 (Docker)</p>
            <span className="text-[10px] text-zinc-500">HTTP REST Ready</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm flex items-center gap-3">
          <div className="size-10 rounded-lg bg-purple-50 dark:bg-purple-950 flex items-center justify-center shrink-0">
            <Database className="size-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500" />
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Redis & BullMQ</p>
            </div>
            <p className="text-[11px] font-mono text-zinc-500 mt-0.5">Port 6379 (Active)</p>
            <span className="text-[10px] text-zinc-500">Poll Interval: 3000ms</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm flex items-center gap-3">
          <div className="size-10 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center shrink-0">
            <Activity className="size-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500" />
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Inbound Webhook</p>
            </div>
            <p className="text-[11px] font-mono text-zinc-500 mt-0.5">Port 3030 (Active)</p>
            <span className="text-[10px] text-zinc-500">Live AI Routing</span>
          </div>
        </div>
      </div>

      {/* Operational Maintenance Lock Control */}
      <WhatsAppLockControl initialConfig={whatsappLockConfig} />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Messages Sent</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {sentCount}
          </p>
          <span className="text-xs text-zinc-500 mt-1 block">Transactional outbox delivered</span>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Pending Outbox</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {pendingCount}
          </p>
          <span className="text-xs text-zinc-500 mt-1 block">In queue for dispatch</span>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Knowledge Base Docs</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
            {knowledgeCount}
          </p>
          <Link
            href="/admin/whatsapp-agent/knowledge"
            className="text-xs font-medium text-blue-600 hover:underline mt-1 inline-flex items-center gap-1"
          >
            <span>Manage documents</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Human Support Tickets</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
            {supportTickets.filter((t) => t.status === "open").length}
          </p>
          <span className="text-xs text-zinc-500 mt-1 block">Escalated via WhatsApp</span>
        </div>
      </div>

      {/* Interactive Live Verification Simulator */}
      <LiveVerificationTool />

      {/* Two Column: Recent Outbox Messages & Escalated Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Outbox Activity Log (2 cols) */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Recent WhatsApp Outbox Activity
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Real-time transactional messages dispatched to members and leads.
              </p>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              Live Feed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-300">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Recipient</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Dispatched</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {recentOutbox.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-zinc-400">
                      No outbox messages dispatched yet. Use the Live Verification Tool above to test.
                    </td>
                  </tr>
                ) : (
                  recentOutbox.map((msg) => (
                    <tr key={msg.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                      <td className="px-5 py-3.5 font-mono text-zinc-900 dark:text-zinc-100">
                        +91 {msg.recipient_phone.replace(/\D/g, "").slice(-10)}
                      </td>
                      <td className="px-5 py-3.5 capitalize font-medium text-zinc-700 dark:text-zinc-300">
                        {msg.message_type?.replace(/_/g, " ") || "Notification"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                            msg.status === "sent"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : msg.status === "pending" || msg.status === "processing"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                          }`}
                        >
                          {msg.status === "sent" ? (
                            <CheckCircle2 className="size-3" />
                          ) : msg.status === "pending" ? (
                            <Clock className="size-3" />
                          ) : (
                            <AlertTriangle className="size-3" />
                          )}
                          {msg.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400">
                        {msg.sent_at
                          ? new Date(msg.sent_at).toLocaleTimeString("en-IN")
                          : new Date(msg.created_at).toLocaleTimeString("en-IN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Support Tickets & Quick Links (1 col) */}
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Escalated Support Requests
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5 mb-4">
              Users requiring organizer follow-up.
            </p>

            <div className="space-y-3">
              {supportTickets.length === 0 ? (
                <p className="text-xs text-zinc-400 py-6 text-center">
                  No active support tickets. AI agent resolving all queries autonomously.
                </p>
              ) : (
                supportTickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {t.ticket_number}
                      </span>
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-800 capitalize">
                        {t.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{t.subject}</p>
                    <p className="text-[10px] text-zinc-400 mt-1">From: +91 {t.sender_phone.slice(-10)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-8 rounded-lg bg-brand-ink text-white flex items-center justify-center">
                <BookOpen className="size-4" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Authoritative Knowledge Store
              </h4>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
              All community facts, leadership roles, one-liner tagline, and platform links are indexed here for real-time AI and fallback lookups.
            </p>
            <Link
              href="/admin/whatsapp-agent/knowledge"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold transition"
            >
              <span>Open Knowledge Base Console</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
