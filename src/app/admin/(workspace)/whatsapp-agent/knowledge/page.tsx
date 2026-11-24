import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdminPagePermission } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "WhatsApp AI & Live Knowledge Hub" };

export default async function WhatsAppAgentKnowledgePage() {
  const ctx = await requireAdminPagePermission("members.read");
  const admin = createAdminClient();

  // Fetch metrics in parallel, including the true exact count of published knowledge docs
  const [
    docsCountRes,
    docsRes,
    outboxRes,
    deploymentsRes,
    ticketsRes,
    claimsRes,
  ] = await Promise.all([
    admin
      .from("csc_agent_knowledge_documents")
      .select("id", { count: "exact", head: true }),
    admin
      .from("csc_agent_knowledge_documents")
      .select("id, source, category, title, tier, is_published, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100),
    admin
      .from("csc_agent_change_outbox")
      .select("status, count")
      .limit(100),
    admin
      .from("csc_agent_deployment_history")
      .select("id, source, commit_sha, commit_message, is_production, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("csc_agent_support_tickets")
      .select("id, ticket_number, sender_phone, subject, status, priority, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("membership_claims")
      .select("id, full_name, status, submitted_at")
      .in("status", ["claim_submitted", "pending_verification"])
      .order("submitted_at", { ascending: false })
      .limit(10),
  ]);

  const totalDocsCount = docsCountRes.count ?? (docsRes.data?.length || 0);
  const knowledgeDocs = docsRes.data || [];
  const deployments = deploymentsRes.data || [];
  const tickets = ticketsRes.data || [];
  const pendingClaims = claimsRes.data || [];

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        title="WhatsApp Agent Live Intelligence & Knowledge Hub"
        description="Authoritative sync monitor: Database triggers, GitHub commit intelligence, Vercel production verification, 5-minute automated membership claims, and WhatsApp support escalation."
        isDemo={ctx.mode === "preview"}
      />

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Indexed Knowledge Docs</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {totalDocsCount}
          </p>
          <span className="mt-1 inline-flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
            ● Level 1 Public & Level 2 Member ({knowledgeDocs.length} shown below)
          </span>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Pending 5-Min Claims</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {pendingClaims.length}
          </p>
          <span className="mt-1 inline-flex items-center text-xs font-medium text-zinc-500">
            Automated worker cycle: 30s
          </span>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Open Support Tickets</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
            {tickets.filter((t) => t.status === "open").length}
          </p>
          <span className="mt-1 inline-flex items-center text-xs font-medium text-zinc-500">
            Human WhatsApp escalation
          </span>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Verified Deployments</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
            {deployments.filter((d) => d.status === "verified").length}
          </p>
          <span className="mt-1 inline-flex items-center text-xs font-medium text-zinc-500">
            GitHub main & Vercel prod
          </span>
        </div>
      </div>

      {/* Knowledge Documents Section */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Live Indexed Knowledge Documents ({totalDocsCount})
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Synchronized automatically across events, verified founders, core policies, legal SLAs, and system architecture.
            </p>
          </div>
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Vector Store Active
          </span>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs font-medium text-zinc-500 uppercase tracking-wider sticky top-0 backdrop-blur-xs">
              <tr>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Document Title</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Security Tier</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Last Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {knowledgeDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-zinc-400 text-xs">
                    No documents indexed yet. Live database triggers and change worker will auto-populate this table.
                  </td>
                </tr>
              ) : (
                knowledgeDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="px-5 py-3.5 font-mono text-xs uppercase text-zinc-500">
                      {doc.category}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                      {doc.title}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-zinc-500">{doc.source}</td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                        Tier {doc.tier} {doc.tier === 1 ? "(Public)" : "(Member-Verified)"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Published</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-zinc-400">
                      {new Date(doc.updated_at).toLocaleTimeString("en-IN")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two-column layout: Support Tickets & Deployments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Support Tickets */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Escalated WhatsApp Support Tickets
          </h3>
          <p className="text-xs text-zinc-500 mt-1 mb-4">
            Members who triggered the HUMAN or SUPPORT command via WhatsApp.
          </p>

          <div className="space-y-3">
            {tickets.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">No open tickets. AI handling inquiries autonomously.</p>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 flex justify-between items-center"
                >
                  <div>
                    <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {t.ticket_number}
                    </span>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">{t.subject}</p>
                    <span className="text-[10px] text-zinc-400">From: {t.sender_phone}</span>
                  </div>
                  <span className="px-2 py-1 text-[11px] font-semibold rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 capitalize">
                    {t.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Deployments & Commits */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            GitHub & Vercel Deployment Stream
          </h3>
          <p className="text-xs text-zinc-500 mt-1 mb-4">
            Production verification pipeline filtering preview builds out of live knowledge.
          </p>

          <div className="space-y-3">
            {deployments.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">No deployment events logged yet.</p>
            ) : (
              deployments.map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {d.source.toUpperCase()}
                      </span>
                      <span className="font-mono text-[11px] text-zinc-400">
                        {d.commit_sha.slice(0, 7)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 truncate max-w-[240px]">
                      {d.commit_message || "Production deployment"}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-[11px] font-semibold rounded capitalize ${
                      d.status === "verified"
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {d.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
