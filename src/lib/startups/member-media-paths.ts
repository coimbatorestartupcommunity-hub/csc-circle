/** Keep media roles attached to their source fields; never infer a role by array index after filtering. */
export function internalStartupMediaPath(path: string | null | undefined): string | null {
  if (!path || /^https?:\/\//i.test(path) || path.startsWith("/") || path.includes("..")) return null;
  return path;
}
