import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { InvalidInputError } from "../../common/domain/errors";
import { MAX_TEAM_LOGO_BYTES } from "../domain/team-logo";
import { TeamLogoService } from "./team-logo.service";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>');
const WEBP_OUTPUT = new Uint8Array([9, 9, 9]);

function setup(bytes: Uint8Array, size = { width: 512, height: 256 }) {
  const source = { download: vi.fn(async () => bytes) };
  const images = {
    dimensions: vi.fn(async () => size),
    normalize: vi.fn(async () => WEBP_OUTPUT),
  };
  const storage = {
    put: vi.fn(async (key: string) => `https://cdn.sarpbc.test/${key}`),
  };
  return { source, images, storage, service: new TeamLogoService(source, images, storage) };
}

describe("TeamLogoService", () => {
  const hash = createHash("sha256").update(WEBP_OUTPUT).digest("hex").slice(0, 16);

  it("normalizes a raster logo and stores it under the team's variant key", async () => {
    const { source, images, storage, service } = setup(PNG);

    const url = await service.upload("kc", "light", "https://kcorp.gg/logo.png");

    expect(source.download).toHaveBeenCalledWith(
      new URL("https://kcorp.gg/logo.png"),
      MAX_TEAM_LOGO_BYTES,
    );
    expect(images.dimensions).toHaveBeenCalledWith(PNG);
    expect(images.normalize).toHaveBeenCalledWith(PNG, "png", 512);
    expect(storage.put).toHaveBeenCalledWith(
      `teams/kc/logo-light-${hash}.webp`,
      WEBP_OUTPUT,
      "image/webp",
    );
    expect(url).toBe(`https://cdn.sarpbc.test/teams/kc/logo-light-${hash}.webp`);
  });

  it("normalizes a safe SVG without a pixel minimum", async () => {
    const { images, storage, service } = setup(SVG);

    await service.upload("kc", "dark", "https://kcorp.gg/logo.svg");

    expect(images.dimensions).not.toHaveBeenCalled();
    expect(images.normalize).toHaveBeenCalledWith(SVG, "svg", 512);
    expect(storage.put).toHaveBeenCalledWith(
      `teams/kc/logo-dark-${hash}.webp`,
      WEBP_OUTPUT,
      "image/webp",
    );
  });

  it("refuses unsafe URLs before downloading", async () => {
    const { source, service } = setup(PNG);

    await expect(service.upload("kc", "light", "http://kcorp.gg/logo.png")).rejects.toThrow(
      "must use https",
    );
    await expect(
      service.upload("kc", "light", "https://liquipedia.net/commons/images/kc.png"),
    ).rejects.toThrow("Liquipedia");
    expect(source.download).not.toHaveBeenCalled();
  });

  it.each([
    ["an oversized file", new Uint8Array(MAX_TEAM_LOGO_BYTES + 1), "larger than 2 MB"],
    ["an unsupported format", new Uint8Array([0xff, 0xd8, 0xff]), "PNG, WebP or SVG"],
    [
      "an SVG with a script",
      new TextEncoder().encode("<svg><script>alert(1)</script></svg>"),
      "a script element",
    ],
  ])("stores nothing for %s", async (_, bytes, message) => {
    const { images, storage, service } = setup(bytes);

    await expect(service.upload("kc", "light", "https://kcorp.gg/logo")).rejects.toThrow(message);
    expect(images.normalize).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
  });

  it("stores nothing for a raster logo below the minimum size", async () => {
    const { storage, service } = setup(PNG, { width: 64, height: 64 });

    await expect(service.upload("kc", "light", "https://kcorp.gg/logo.png")).rejects.toThrow(
      InvalidInputError,
    );
    expect(storage.put).not.toHaveBeenCalled();
  });
});
