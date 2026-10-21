export function assertSafeTestTarget(
  value: string | undefined,
  options?: { authenticated?: boolean; mailSinkUrl?: string },
): Readonly<{ local: true; projectRef: "local" }>;

export function parseSupabaseStatus(output: string): Record<string, string>;

export function assertLocalSupabaseStatus(status: Record<string, string>): true;

export function createLocalE2EEnvironment(
  sourceEnv: Record<string, string | undefined>,
  local: Record<string, string>,
  dotenvKeys?: string[],
): Record<string, string | undefined>;

export function dotenvAssignmentNames(contents: string): string[];
