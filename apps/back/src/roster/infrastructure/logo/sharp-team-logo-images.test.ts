import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../../common/domain/errors";
import { SharpTeamLogoImages } from "./sharp-team-logo-images";

const images = new SharpTeamLogoImages();

function png(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 20, b: 20 } },
  })
    .png()
    .toBuffer();
}

describe("SharpTeamLogoImages", () => {
  it("reads raster dimensions", async () => {
    expect(await images.dimensions(await png(300, 150))).toEqual({
      width: 300,
      height: 150,
    });
  });

  it("normalizes a wide opaque PNG into a square transparent WebP", async () => {
    const output = await images.normalize(await png(300, 150), "png", 512);

    const { data, info } = await sharp(output).raw().toBuffer({ resolveWithObject: true });
    const meta = await sharp(output).metadata();
    expect(meta).toMatchObject({ format: "webp", width: 512, height: 512, hasAlpha: true });
    expect(data[info.channels - 1]).toBe(0);
    expect(data[(256 * 512 + 256) * info.channels + 3]).toBe(255);
  });

  it("rasterizes a small SVG at full size", async () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="#0af"/></svg>',
    );

    const output = await images.normalize(svg, "svg", 512);

    expect(await sharp(output).metadata()).toMatchObject({
      format: "webp",
      width: 512,
      height: 512,
      hasAlpha: true,
    });
  });

  it("reports undecodable bytes as invalid input", async () => {
    const broken = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

    await expect(images.dimensions(broken)).rejects.toThrow(InvalidInputError);
    await expect(images.normalize(broken, "png", 512)).rejects.toThrow("could not be decoded");
  });
});
