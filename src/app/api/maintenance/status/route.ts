import { NextResponse } from "next/server";
import { getWebsiteMaintenanceConfig } from "@/lib/services/system-settings";

export async function GET() {
  try {
    const config = await getWebsiteMaintenanceConfig();
    const isMaintenance =
      config.enabled && (!config.unlockEpochMs || Date.now() < config.unlockEpochMs);

    return NextResponse.json(
      {
        maintenance: isMaintenance,
        config: isMaintenance ? config : null,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
        },
      }
    );
  } catch {
    return NextResponse.json({ maintenance: false, config: null }, { status: 200 });
  }
}
