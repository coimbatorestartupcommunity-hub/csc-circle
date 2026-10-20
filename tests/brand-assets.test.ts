// @vitest-environment node
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { brandAssets } from "@/lib/content/site";

describe("CSC brand assets", () => {
  it("serves the same transparent 4K CSC master for the site logo and icon", async () => {
    expect(brandAssets.cscLogo).toBe(brandAssets.cscIcon);
    const file = `public${brandAssets.cscLogo}`;
    const metadata = await sharp(file).metadata();
    expect(metadata.width).toBe(4096);
    expect(metadata.height).toBe(4096);
    expect(metadata.hasAlpha).toBe(true);
  });
});
