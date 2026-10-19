export type Failure = { outcome: "failed_retryable" | "failed_permanent" | "ambiguous"; code: string };
/** Never persist raw SMTP errors: they may contain personal information. */
export function classifyEmailFailure(error: unknown): Failure {
  const e = error && typeof error === "object" ? error as { code?: string; responseCode?: number; command?: string } : {};
  if (e.code === "EAUTH") return { outcome: "failed_permanent", code: "SMTP_AUTH_FAILED" };
  if (e.responseCode && e.responseCode >= 500) return { outcome: "failed_permanent", code: "SMTP_REJECTED" };
  if (e.responseCode && e.responseCode >= 400) return { outcome: "failed_retryable", code: "SMTP_TEMPORARY_REJECTION" };
  if (["EDNS", "ECONNREFUSED"].includes(e.code ?? "") || e.command === "CONN") return { outcome: "failed_retryable", code: "SMTP_CONNECT_FAILED" };
  return { outcome: "ambiguous", code: "AMBIGUOUS_DELIVERY" };
}
