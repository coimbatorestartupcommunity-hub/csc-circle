import { describe, expect, it } from "vitest";
import { internalStartupMediaPath } from "@/lib/startups/member-media-paths";

describe("startup media path roles", () => {
  it("keeps absent directory media absent even when an internal logo exists", () => {
    const directoryPath = internalStartupMediaPath(null);
    const logoPath = internalStartupMediaPath("owner/startup-logo.webp");
    expect(directoryPath).toBeNull();
    expect(logoPath).toBe("owner/startup-logo.webp");
  });

  it("does not treat external logo URLs or unsafe paths as storage object names", () => {
    expect(internalStartupMediaPath("https://cdn.example.test/logo.webp")).toBeNull();
    expect(internalStartupMediaPath("../other-startup/image.webp")).toBeNull();
  });
});
