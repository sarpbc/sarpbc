import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { IntegrationError, InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { TwimgImageGateway } from "../infrastructure/twimg-image.gateway";
import { TweetImageService } from "./tweet-image.service";

describe("TweetImageService", () => {
  const originalFetch = global.fetch;
  const imageUrl = "https://pbs.twimg.com/media/photo.jpg?name=small";
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  let service: TweetImageService;

  beforeEach(() => {
    service = new TweetImageService(new TwimgImageGateway());
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const image = (body: BodyInit | null, init: ResponseInit = {}) =>
    new Response(body, { status: 200, headers: { "content-type": "image/jpeg" }, ...init });

  it("loads an allowlisted image without a Referer and without following other hosts", async () => {
    (global.fetch as Mock).mockResolvedValue(image(jpeg));

    const result = await service.load(imageUrl);

    expect(result).toEqual({ contentType: "image/jpeg", body: Buffer.from(jpeg) });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(imageUrl);
    expect(init.redirect).toBe("manual");
    expect(new Headers(init.headers).has("referer")).toBe(false);
  });

  it.each([
    "http://pbs.twimg.com/media/photo.jpg",
    "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png",
    "https://video.twimg.com/amplify_video/1/vid/a.mp4",
    "https://pbs.twimg.com.evil.example/media/photo.jpg",
    "https://pbs.twimg.com@evil.example/media/photo.jpg",
    "https://user:pass@pbs.twimg.com/media/photo.jpg",
    "https://pbs.twimg.com:8443/media/photo.jpg",
    "https://127.0.0.1/media/photo.jpg",
    "file:///etc/passwd",
    "pbs.twimg.com/media/photo.jpg",
    "not a url",
  ])("rejects %s before fetching", async (url) => {
    await expect(service.load(url)).rejects.toBeInstanceOf(InvalidInputError);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("follows a redirect that stays on the allowlisted host", async () => {
    const next = "https://pbs.twimg.com/media/photo.jpg?name=orig";
    (global.fetch as Mock)
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: next } }))
      .mockResolvedValueOnce(image(jpeg));

    await expect(service.load(imageUrl)).resolves.toMatchObject({ contentType: "image/jpeg" });
    expect((global.fetch as Mock).mock.calls[1]?.[0]).toBe(next);
  });

  it("keeps a protocol-relative looking path on the allowlisted host", async () => {
    (global.fetch as Mock).mockResolvedValue(image(jpeg));

    await service.load("https://pbs.twimg.com//evil.example/photo.jpg#frag");

    expect((global.fetch as Mock).mock.calls[0]?.[0]).toBe(
      "https://pbs.twimg.com//evil.example/photo.jpg",
    );
  });

  it("resolves a relative redirect against the allowlisted host", async () => {
    (global.fetch as Mock)
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: "/media/photo.jpg?name=orig" } }),
      )
      .mockResolvedValueOnce(image(jpeg));

    await expect(service.load(imageUrl)).resolves.toMatchObject({ contentType: "image/jpeg" });
    expect((global.fetch as Mock).mock.calls[1]?.[0]).toBe(
      "https://pbs.twimg.com/media/photo.jpg?name=orig",
    );
  });

  it.each([
    "https://evil.example/photo.jpg",
    "http://pbs.twimg.com/media/photo.jpg",
    "//evil.example/photo.jpg",
    "https://pbs.twimg.com@evil.example/photo.jpg",
    "",
  ])("rejects a redirect to %j", async (location) => {
    (global.fetch as Mock).mockResolvedValue(
      new Response(null, { status: 301, headers: location ? { location } : {} }),
    );

    await expect(service.load(imageUrl)).rejects.toBeInstanceOf(IntegrationError);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("stops after too many redirects", async () => {
    (global.fetch as Mock).mockImplementation(
      async () => new Response(null, { status: 302, headers: { location: imageUrl } }),
    );

    await expect(service.load(imageUrl)).rejects.toBeInstanceOf(IntegrationError);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it.each(["text/html", "image/svg+xml", "application/octet-stream", ""])(
    "rejects a %j response",
    async (contentType) => {
      (global.fetch as Mock).mockResolvedValue(
        image("<svg/>", { headers: { "content-type": contentType } }),
      );

      await expect(service.load(imageUrl)).rejects.toBeInstanceOf(IntegrationError);
    },
  );

  it("rejects images over the size limit, declared or streamed", async () => {
    const tooLarge = new Uint8Array(5 * 1024 * 1024 + 1);
    (global.fetch as Mock)
      .mockResolvedValueOnce(
        image(jpeg, { headers: { "content-type": "image/jpeg", "content-length": "6000000" } }),
      )
      .mockResolvedValueOnce(image(tooLarge));

    await expect(service.load(imageUrl)).rejects.toBeInstanceOf(IntegrationError);
    await expect(service.load(imageUrl)).rejects.toBeInstanceOf(IntegrationError);
  });

  it.each([404, 410])("reports an image removed from X (%i) as not found", async (status) => {
    (global.fetch as Mock).mockResolvedValue(image(null, { status }));

    await expect(service.load(imageUrl)).rejects.toBeInstanceOf(NotFoundError);
  });

  it.each([403, 500, 503])("reports an upstream %i as an integration failure", async (status) => {
    (global.fetch as Mock).mockResolvedValue(image(null, { status }));

    await expect(service.load(imageUrl)).rejects.toBeInstanceOf(IntegrationError);
  });

  it("reports network failures and timeouts as integration failures", async () => {
    (global.fetch as Mock).mockRejectedValue(new DOMException("timed out", "TimeoutError"));

    await expect(service.load(imageUrl)).rejects.toBeInstanceOf(IntegrationError);
  });
});
