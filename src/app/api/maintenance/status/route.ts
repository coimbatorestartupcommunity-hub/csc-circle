import { NextResponse } from "next/server";
import {
  getWebsiteMaintenanceConfig,
  getScheduledDowntimeConfig,
  getSubsystemMaintenanceConfig,
} from "@/lib/services/system-settings";

export async function GET() {
  try {
    const [config, scheduled, subsystems] = await Promise.all([
      getWebsiteMaintenanceConfig(),
      getScheduledDowntimeConfig(),
      getSubsystemMaintenanceConfig(),
    ]);

    const isMaintenance =
      config.enabled && (!config.unlockEpochMs || Date.now() < config.unlockEpochMs);

    // Check if within 24-hour advance warning window for scheduled downtime
    const now = Date.now();
    const isNoticeWindow = Boolean(
      scheduled.scheduled &&
      scheduled.startEpochMs &&
      scheduled.showNotice24h &&
      now >= (scheduled.startEpochMs - 24 * 60 * 60 * 1000) &&
      now < scheduled.startEpochMs
    );

    return NextResponse.json(
      {
        maintenance: isMaintenance,
        config: isMaintenance ? config : null,
        subsystems,
        upcomingDowntime: isNoticeWindow
          ? {
              startEpochMs: scheduled.startEpochMs,
              endEpochMs: scheduled.endEpochMs,
              title: scheduled.title,
              message: scheduled.message,
            }
          : null,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
        },
      }
    );
  } catch {
    return NextResponse.json({ maintenance: false, config: null, subsystems: null, upcomingDowntime: null }, { status: 200 });
  }
}
