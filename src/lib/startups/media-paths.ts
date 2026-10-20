const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export function isStartupDirectoryImagePath(path: string, userId: string, startupId: string) {
  if (!isUuid(userId) || !isUuid(startupId)) return false;
  return path === `${userId}/${startupId}-directory-startup.webp`
    || new RegExp(`^${userId}/${startupId}-revision-${UUID_PATTERN.source.slice(1, -1)}-directory-startup\\.webp$`, "i").test(path);
}

export function isSharedStartupDirectoryImagePath(path: string, userId: string, startupId: string) {
  if (isStartupDirectoryImagePath(path, userId, startupId)) return true;
  if (!isUuid(userId)) return false;

  // Older profile-level crops remain usable only as the consented fallback.
  return new RegExp(`^${userId}/${UUID_PATTERN.source.slice(1, -1)}-directory\\.webp$`, "i").test(path);
}

export function isStartupLogoPath(path: string, userId: string, startupId: string) {
  if (!isUuid(userId) || !isUuid(startupId)) return false;
  return path === `${userId}/${startupId}-startup-logo.webp`
    || new RegExp(`^${userId}/${startupId}-revision-${UUID_PATTERN.source.slice(1, -1)}-startup-logo\\.webp$`, "i").test(path)
    // Older approved startup records used a separate owner-scoped media UUID.
    || new RegExp(`^${userId}/${UUID_PATTERN.source.slice(1, -1)}-startup-logo\\.webp$`, "i").test(path);
}
