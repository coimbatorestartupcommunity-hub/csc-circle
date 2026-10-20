import { describe, expect, it } from "vitest";
import {
  isSharedStartupDirectoryImagePath,
  isStartupDirectoryImagePath,
  isStartupLogoPath,
} from "@/lib/startups/media-paths";

const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const startup = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const revision = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("startup media references", () => {
  it("accepts base and revision-scoped directory images for their owner and startup", () => {
    expect(isStartupDirectoryImagePath(`${owner}/${startup}-directory-startup.webp`, owner, startup)).toBe(true);
    expect(isStartupDirectoryImagePath(`${owner}/${startup}-revision-${revision}-directory-startup.webp`, owner, startup)).toBe(true);
  });

  it("rejects another startup, owner, or a non-WebP storage key", () => {
    expect(isStartupDirectoryImagePath(`${owner}/${revision}-directory-startup.webp`, owner, startup)).toBe(false);
    expect(isStartupDirectoryImagePath(`${revision}/${startup}-directory-startup.webp`, owner, startup)).toBe(false);
    expect(isStartupDirectoryImagePath(`${owner}/${startup}-revision-${revision}-directory-startup.png`, owner, startup)).toBe(false);
  });

  it("permits legacy member-photo crops only through the shared-image fallback validator", () => {
    expect(isStartupDirectoryImagePath(`${owner}/${revision}-directory.webp`, owner, startup)).toBe(false);
    expect(isSharedStartupDirectoryImagePath(`${owner}/${revision}-directory.webp`, owner, startup)).toBe(true);
    expect(isSharedStartupDirectoryImagePath(`${revision}/${revision}-directory.webp`, owner, startup)).toBe(false);
  });

  it("accepts new owner/startup-bound and legacy owner-scoped logos", () => {
    expect(isStartupLogoPath(`${owner}/${startup}-startup-logo.webp`, owner, startup)).toBe(true);
    expect(isStartupLogoPath(`${owner}/${startup}-revision-${revision}-startup-logo.webp`, owner, startup)).toBe(true);
    expect(isStartupLogoPath(`${owner}/${revision}-startup-logo.webp`, owner, startup)).toBe(true);
    expect(isStartupLogoPath(`${owner}/${revision}-revision-${startup}-startup-logo.webp`, owner, startup)).toBe(false);
    expect(isStartupLogoPath(`${revision}/${startup}-startup-logo.webp`, owner, startup)).toBe(false);
  });
});
