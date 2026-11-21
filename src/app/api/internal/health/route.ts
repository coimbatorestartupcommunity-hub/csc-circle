import { NextResponse } from "next/server";
import { getAllCircuitBreakers } from "@/lib/circuit-breaker";

export async function GET(request: Request) {
  // Reading request makes this route dynamically evaluated on demand
  const _url = request.url;
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    circuits: getAllCircuitBreakers(),
  });
}
