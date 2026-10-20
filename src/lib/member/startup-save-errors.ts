export type StartupSaveErrorCode =
  | "STARTUP_DETAILS_INVALID"
  | "DIRECTORY_CONSENT_REQUIRED"
  | "DIRECTORY_IMAGE_INVALID"
  | "DIRECTORY_IMAGE_MISSING"
  | "STARTUP_LOGO_INVALID"
  | "STARTUP_LOGO_MISSING"
  | "STARTUP_REVISION_PENDING"
  | "STARTUP_SLUG_CONFLICT"
  | "STARTUP_REVISION_STALE"
  | "STARTUP_NOT_EDITABLE"
  | "STARTUP_SAVE_FAILED";

export function classifyStartupSaveError(code: string, message: string): StartupSaveErrorCode {
  const normalized = message.toLowerCase();
  if (normalized.includes("directory consent required")) return "DIRECTORY_CONSENT_REQUIRED";
  if (normalized.includes("invalid revision image path")) return "DIRECTORY_IMAGE_INVALID";
  if (normalized.includes("revision image missing")) return "DIRECTORY_IMAGE_MISSING";
  if (normalized.includes("invalid revision logo path")) return "STARTUP_LOGO_INVALID";
  if (normalized.includes("revision logo missing")) return "STARTUP_LOGO_MISSING";
  if (normalized.includes("already pending") || normalized.includes("already submitted")) return "STARTUP_REVISION_PENDING";
  if (normalized.includes("duplicate key")) return "STARTUP_SLUG_CONFLICT";
  if (code === "40001") return "STARTUP_REVISION_STALE";
  if (code === "42501") return "STARTUP_NOT_EDITABLE";
  if (normalized.includes("invalid startup details") || normalized.includes("invalid revision data")) return "STARTUP_DETAILS_INVALID";
  if (code === "23514" || code === "22023") return "STARTUP_DETAILS_INVALID";
  return "STARTUP_SAVE_FAILED";
}

export function startupSaveErrorResponse(code: StartupSaveErrorCode) {
  const messages: Record<StartupSaveErrorCode, string> = {
    STARTUP_DETAILS_INVALID: "Complete the highlighted required startup information and check the directory URL slug.",
    DIRECTORY_CONSENT_REQUIRED: "Enable CSC Founder Directory participation and public-name consent in your member profile before submitting.",
    DIRECTORY_IMAGE_INVALID: "This directory image reference is not valid for this startup. Keep its approved image or upload a replacement.",
    DIRECTORY_IMAGE_MISSING: "The saved directory image could not be found. Please upload your 4:3 image again.",
    STARTUP_LOGO_INVALID: "The company logo could not be matched to this startup. Replace it or remove the optional logo.",
    STARTUP_LOGO_MISSING: "The saved company logo could not be found. Replace it or remove the optional logo.",
    STARTUP_REVISION_PENDING: "Your startup changes are already awaiting administrator approval.",
    STARTUP_SLUG_CONFLICT: "That directory URL is already in use. Change the startup slug and try again.",
    STARTUP_REVISION_STALE: "This startup changed after you opened the editor. Refresh the latest version before continuing.",
    STARTUP_NOT_EDITABLE: "This startup is no longer available for editing in its current status. Refresh My Startups and try again.",
    STARTUP_SAVE_FAILED: "Startup changes could not be saved. Refresh and review the current startup status.",
  };
  return { code, error: messages[code] };
}
