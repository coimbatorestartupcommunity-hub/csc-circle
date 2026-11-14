import http from "node:http";

const TARGET_URL =
  process.env.CSC_RECONCILE_URL ||
  "https://csc.logicintelligencetechnologies.in/api/internal/payments/reconcile";
const CRON_SECRET = process.env.CRON_SECRET || "";
const INTERVAL_MS = Number(process.env.RECONCILE_INTERVAL_MS || 30000); // 30 seconds

let lastResult = null;
let lastRunAt = null;
let runCount = 0;

async function runReconciliation() {
  runCount++;
  lastRunAt = new Date().toISOString();
  try {
    const headers = {
      "User-Agent": "CSC-Render-Reconcile-Worker/1.0",
      "x-vercel-cron": "1",
    };
    if (CRON_SECRET) {
      headers["Authorization"] = `Bearer ${CRON_SECRET}`;
    }
    const response = await fetch(TARGET_URL, {
      method: "GET",
      headers,
    });
    const data = await response.json().catch(() => ({}));
    lastResult = {
      status: response.status,
      ok: response.ok,
      data,
      at: lastRunAt,
      runCount,
    };
    console.log(`[${lastRunAt}] Reconcile #${runCount}: HTTP ${response.status}`, data);
  } catch (error) {
    lastResult = {
      status: 0,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      at: lastRunAt,
      runCount,
    };
    console.error(`[${lastRunAt}] Reconcile #${runCount} Failed:`, error.message);
  }
}

// Initial run immediately upon start
runReconciliation();

// Recurring run every 30 seconds 24x7
const timer = setInterval(runReconciliation, INTERVAL_MS);

// HTTP Health & Monitoring Server for Render
const server = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify(
        {
          service: "csc-reconcile-worker",
          status: "healthy",
          uptimeSeconds: Math.floor(process.uptime()),
          lastRunAt,
          runCount,
          lastResult,
        },
        null,
        2
      )
    );
    return;
  }
  if (req.url === "/trigger") {
    runReconciliation();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ triggered: true, at: new Date().toISOString() }));
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`CSC Reconcile Worker running on port ${PORT}, polling every ${INTERVAL_MS}ms 24/7...`);
});

process.on("SIGTERM", () => {
  clearInterval(timer);
  server.close(() => process.exit(0));
});
