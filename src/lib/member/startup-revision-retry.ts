type RevisionSnapshot = {
  status?: unknown;
  proposed_data?: unknown;
  proposed_private_details?: unknown;
} | null | undefined;

function canonicalJson(value: unknown): string {
  const sort = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(sort);
    if (item && typeof item === "object") {
      return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, sort(child)]));
    }
    return item;
  };
  return JSON.stringify(sort(value));
}

/** Only acknowledges an exact retry of the same pending, owner-scoped revision. */
export function isExactPendingStartupRevisionRetry(
  revision: RevisionSnapshot,
  proposed: unknown,
  privateDetails: unknown,
): boolean {
  return revision?.status === "pending"
    && canonicalJson(revision.proposed_data) === canonicalJson(proposed)
    && canonicalJson(revision.proposed_private_details ?? {}) === canonicalJson(privateDetails ?? {});
}
