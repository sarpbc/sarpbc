import { describe, expect, it, vi } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { MAX_TEAM_LOGO_BYTES } from "../domain/team-logo";
import { TeamLogoService } from "./team-logo.service";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>');
const WEBP_OUTPUT = new Uint8Array([9, 9, 9]);

const stored = (key: string) => ({ key, url: `https://cdn.sarpbc.test/${key}` });

const DEFAULT_SIZE = { width: 512, height: 256 };

function setup(bytes: Uint8Array, size = DEFAULT_SIZE) {
  const source = { download: vi.fn(async () => bytes) };

  const images = {
    dimensions: vi.fn(async () => size),
    normalize: vi.fn(async () => WEBP_OUTPUT),
  };

  const storage = {
    put: vi.fn(async (key: string) => stored(key)),
    copy: vi.fn(async (_sourceKey: string, key: string) => stored(key)),
    delete: vi.fn(async () => {}),
  };

  return { source, images, storage, service: new TeamLogoService(source, images, storage) };
}

describe("TeamLogoService", () => {
  const hash = "0123456789abcdef";

  it("normalizes a raster logo and stages it under the team's pending variant key", async () => {
    const { source, images, storage, service } = setup(PNG);

    const logo = await service.upload("kc", "light", "https://kcorp.gg/logo.png");

    expect(source.download).toHaveBeenCalledWith(
      new URL("https://kcorp.gg/logo.png"),
      MAX_TEAM_LOGO_BYTES,
    );
    expect(images.dimensions).toHaveBeenCalledWith(PNG);
    expect(images.normalize).toHaveBeenCalledWith(PNG, "png", expect.any(Number));
    expect(logo.key).toMatch(/^pending\/teams\/kc\/logo-light-[0-9a-f]{16}\.webp$/);
    expect(logo.url).toBe(`https://cdn.sarpbc.test/${logo.key}`);
    expect(storage.put).toHaveBeenCalledWith(logo.key, WEBP_OUTPUT, "image/webp");
  });

  it("names the staged asset after its content", async () => {
    const { images, service } = setup(PNG);

    const first = await service.upload("kc", "light", "https://kcorp.gg/logo.png");
    const again = await service.upload("kc", "light", "https://kcorp.gg/logo.png");
    images.normalize.mockResolvedValueOnce(new Uint8Array([7, 7, 7]));
    const changed = await service.upload("kc", "light", "https://kcorp.gg/logo.png");

    expect(again.key).toBe(first.key);
    expect(changed.key).not.toBe(first.key);
  });

  it("normalizes a safe SVG without a pixel minimum", async () => {
    const { images, storage, service } = setup(SVG);

    const logo = await service.upload("kc", "dark", "https://kcorp.gg/logo.svg");

    expect(images.dimensions).not.toHaveBeenCalled();
    expect(images.normalize).toHaveBeenCalledWith(SVG, "svg", expect.any(Number));
    expect(logo.key).toMatch(/^pending\/teams\/kc\/logo-dark-/);
    expect(storage.put).toHaveBeenCalledWith(logo.key, WEBP_OUTPUT, "image/webp");
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

  it("publishes a staged logo under its public key and removes the pending copy", async () => {
    const { storage, service } = setup(PNG);
    const pendingKey = `pending/teams/kc/logo-dark-${hash}.webp`;

    await expect(service.publish(pendingKey)).resolves.toEqual({
      key: `teams/kc/logo-dark-${hash}.webp`,
      url: `https://cdn.sarpbc.test/teams/kc/logo-dark-${hash}.webp`,
    });
    expect(storage.copy).toHaveBeenCalledWith(pendingKey, `teams/kc/logo-dark-${hash}.webp`);
    expect(storage.delete).toHaveBeenCalledExactlyOnceWith(pendingKey);
  });

  it("discards a staged logo", async () => {
    const { storage, service } = setup(PNG);

    await service.discard(`pending/teams/kc/logo-light-${hash}.webp`);

    expect(storage.delete).toHaveBeenCalledExactlyOnceWith(
      `pending/teams/kc/logo-light-${hash}.webp`,
    );
  });

  it.each(["publish", "discard"] as const)(
    "refuses to %s an object outside the pending prefix",
    async (action) => {
      const { storage, service } = setup(PNG);

      await expect(service[action](`teams/kc/logo-light-${hash}.webp`)).rejects.toThrow(
        InvalidInputError,
      );
      expect(storage.copy).not.toHaveBeenCalled();
      expect(storage.delete).not.toHaveBeenCalled();
    },
  );
});
