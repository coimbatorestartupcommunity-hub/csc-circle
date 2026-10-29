const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Prefer a verified account address, then the durable imported/source address. */
export function chooseNotificationRecipient(...candidates: Array<string | null | undefined>) {
  return candidates.map((value) => value?.trim() ?? "").find((value) => EMAIL_PATTERN.test(value)) ?? "";
}
