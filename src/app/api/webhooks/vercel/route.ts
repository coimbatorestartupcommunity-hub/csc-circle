import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-vercel-signature") || "";
    const secret = process.env.VERCEL_WEBHOOK_SECRET || "";

    if (secret && signature) {
      const hmac = crypto.createHmac("sha1", secret);
      const digest = hmac.update(rawBody).digest("hex");
      const sigBuf = Buffer.from(signature);
      const digBuf = Buffer.from(digest);

      if (sigBuf.length !== digBuf.length || !crypto.timingSafeEqual(sigBuf, digBuf)) {
        return NextResponse.json({ error: "Invalid Vercel signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const deployment = payload.payload?.deployment || payload.deployment || payload;

    // Filter for production deployments only
    const target = deployment.target || payload.target;
    const isProduction = target === "production";

    if (!isProduction) {
      return NextResponse.json({
        ignored: true,
        reason: "Preview or non-production deployments do not alter live public knowledge",
      });
    }

    // Check deployment status
    const status = (deployment.status || payload.type || "").toUpperCase();
    const isSucceeded = status.includes("SUCCEEDED") || status.includes("READY");

    if (!isSucceeded) {
      return NextResponse.json({
        ignored: true,
        reason: `Deployment status ${status} is not successful`,
      });
    }

    const commitSha = deployment.meta?.githubCommitSha || deployment.gitSource?.sha || "HEAD";
    const deploymentId = deployment.id || "dep-prod";
    const deploymentUrl = deployment.url ? `https://${deployment.url}` : "https://csc.logicintelligencetechnologies.in";

    const admin = createAdminClient();

    // 1. Record production verification in deployment history
    await admin.from("csc_agent_deployment_history").insert({
      source: "vercel",
      commit_sha: commitSha,
      deployment_id: deploymentId,
      deployment_url: deploymentUrl,
      is_production: true,
      status: "verified",
      files_changed: [],
    });

    // 2. Enqueue change to outbox for knowledge store re-sync
    await admin.from("csc_agent_change_outbox").insert({
      entity_type: "vercel_deployments",
      entity_id: deploymentId,
      change_type: "INSERT",
      payload: {
        deployment_id: deploymentId,
        deployment_url: deploymentUrl,
        commit_sha: commitSha,
        is_production: true,
        verified_at: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      verified: true,
      deploymentId,
      deploymentUrl,
    });
  } catch (err) {
    console.error("[POST /api/webhooks/vercel] Error processing webhook:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
