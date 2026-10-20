import { describe, expect, it } from "vitest";
import { classifyStartupSaveError, startupSaveErrorResponse } from "@/lib/member/startup-save-errors";

describe("startup revision error categories", () => {
  it.each([
    ["23514", "directory consent required", "DIRECTORY_CONSENT_REQUIRED"],
    ["23514", "invalid revision image path", "DIRECTORY_IMAGE_INVALID"],
    ["23514", "revision image missing", "DIRECTORY_IMAGE_MISSING"],
    ["23514", "invalid revision logo path", "STARTUP_LOGO_INVALID"],
    ["23514", "revision logo missing", "STARTUP_LOGO_MISSING"],
    ["23514", "startup revision already pending", "STARTUP_REVISION_PENDING"],
    ["23514", "invalid startup details", "STARTUP_DETAILS_INVALID"],
    ["40001", "serialization failure", "STARTUP_REVISION_STALE"],
    ["42501", "published startup ownership required", "STARTUP_NOT_EDITABLE"],
  ])("maps %s / %s to %s", (sqlState, message, expected) => {
    expect(classifyStartupSaveError(sqlState, message)).toBe(expected);
  });

  it("returns a safe browser message without including database exception text", () => {
    const safe = startupSaveErrorResponse(classifyStartupSaveError("23514", "revision image missing: secret/path"));
    expect(safe).toEqual({ code: "DIRECTORY_IMAGE_MISSING", error: "The saved directory image could not be found. Please upload your 4:3 image again." });
    expect(JSON.stringify(safe)).not.toContain("secret/path");
  });
});
