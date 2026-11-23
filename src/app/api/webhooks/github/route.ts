import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256") || "";
    const event = req.headers.get("x-github-event") || "";
    const secret = process.env.GITHUB_WEBHOOK_SECRET || "";

    if (secret) {
      const hmac = crypto.createHmac("sha256", secret);
      const digest = "sha256=" + hmac.update(rawBody).digest("hex");
      const sigBuf = Buffer.from(signature);
      const digBuf = Buffer.from(digest);

      if (sigBuf.length !== digBuf.length || !crypto.timingSafeEqual(sigBuf, digBuf)) {
        return NextResponse.json({ error: "Invalid GitHub HMAC signature" }, { status: 401 });
      }
    }

    if (event !== "push") {
      return NextResponse.json({ ignored: true, reason: `Event ${event} not tracked` });
    }

    const payload = JSON.parse(rawBody);
    const ref = payload.ref || "";

    // Track only main branch pushes
    if (ref !== "refs/heads/main") {
      return NextResponse.json({ ignored: true, reason: `Branch ${ref} not tracked` });
    }

    const headCommit = payload.head_commit || payload.commits?.[0];
    if (!headCommit) {
      return NextResponse.json({ ignored: true, reason: "No commit found in payload" });
    }

    const commitSha = headCommit.id;
    const commitMessage = headCommit.message;
    const author = headCommit.author?.name || headCommit.author?.username || "Unknown";
    const filesChanged = [
      ...(headCommit.added || []),
      ...(headCommit.modified || []),
      ...(headCommit.removed || []),
    ];

    const admin = createAdminClient();

    // 1. Record into csc_agent_deployment_history
    await admin.from("csc_agent_deployment_history").insert({
      source: "github",
      commit_sha: commitSha,
      commit_message: commitMessage,
      author,
      branch: "main",
      is_production: false, // Becomes true when Vercel production deployment succeeds
      status: "pending",
      files_changed: filesChanged,
    });

    // 2. Enqueue into csc_agent_change_outbox
    await admin.from("csc_agent_change_outbox").insert({
      entity_type: "github_commits",
      entity_id: commitSha,
      change_type: "INSERT",
      payload: {
        commit_sha: commitSha,
        commit_message: commitMessage,
        author,
        files_changed: filesChanged,
      },
    });

    return NextResponse.json({ success: true, commitSha, filesCount: filesChanged.length });
  } catch (err) {
    console.error("[POST /api/webhooks/github] Error processing webhook:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
