import "server-only";
/** Fictional fixtures are limited to local development. Production flags cannot open this boundary. */
export function isMemberPreviewEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}
