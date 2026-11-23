/**
 * Non-blocking asynchronous sleep for the background worker.
 * Never used on frontend or Vercel serverless request paths.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

/**
 * Returns a randomized delay integer between minMs and maxMs for message dispatch pacing.
 */
export function getRandomDelay(minMs: number, maxMs: number): number {
  const safeMin = Math.max(0, minMs);
  const safeMax = Math.max(safeMin, maxMs);
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}
