/** Only allow same-site relative redirect targets (prevents open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/member"): string {
  if (!next) return fallback;
  // Must be a path on this site; reject absolute URLs and protocol-relative.
  if (
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !/[\\\u0000-\u0020\u007f]/.test(next)
  ) return next;
  return fallback;
}
