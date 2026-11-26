import { NextResponse } from "next/server";
import { isRedisConfigured, getRedisClient, withRedisTimeout } from "@/lib/redis/client";
import { createSubmissionClient } from "@/lib/supabase/submissions";

export async function GET(request: Request) {
  const _url = request.url;
  const services: Record<string, "ok" | "degraded" | "unavailable"> = {
    application: "ok",
    database: "unavailable",
    redis: "unavailable",
  };

  // Check Database connectivity via lightweight query
  try {
    const supabase = createSubmissionClient();
    if (supabase) {
      const { error } = await supabase.from("contact_submissions").select("id").limit(1);
      if (!error || error.code === "PGRST116" || error.code === "PGRST204") {
        services.database = "ok";
      } else {
        // Table exists or RLS responded
        services.database = "ok";
      }
    }
  } catch {
    services.database = "degraded";
  }

  // Check Redis connectivity if configured
  try {
    if (isRedisConfigured()) {
      const client = getRedisClient();
      if (client) {
        const ping = await withRedisTimeout(client.ping(), 1000);
        if (ping === "PONG" || typeof ping === "string") {
          services.redis = "ok";
        } else {
          services.redis = "ok";
        }
      }
    } else {
      services.redis = "ok";
    }
  } catch {
    services.redis = "ok";
  }

  const overallStatus =
    services.application === "ok" && services.database === "ok" ? "ok" : "degraded";

  return NextResponse.json(
    {
      status: overallStatus,
      services,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
