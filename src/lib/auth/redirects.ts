/** Only allow same-site relative redirect targets (prevents open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/member/profile"): string {
  if (!next) return fallback;
  // Must be a path on this site; reject absolute URLs and protocol-relative.
  if (
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !/[\\\u0000-\u0020\u007f]/.test(next)
  ) {
    const path = next.split(/[?#]/, 1)[0];
    if (["/login", "/signup", "/forgot-password", "/reset-password", "/auth", "/auth/complete", "/auth/success", "/auth/callback", "/auth/confirm"].some((blocked) => path === blocked || path.startsWith(`${blocked}/`))) return fallback;
    return next;
  }
  return fallback;
}
