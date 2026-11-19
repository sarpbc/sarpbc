import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { IntegrationError } from "../../common/domain/errors/integration-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { TwimgImageGateway } from "../infrastructure/twimg-image.gateway";
import { TweetImageService } from "./tweet-image.service";

const image = (body: ConstructorParameters<typeof Response>[0], init: ResponseInit = {}) =>
  new HttpResponse(body, { headers: { "content-type": "image/jpeg" }, status: 200, ...init });

const redirect = (location: string | null, status = 302) =>
  new HttpResponse(null, { headers: location === null ? {} : { location }, status });

describe(TweetImageService, () => {
  const server = setupServer();
  const imageUrl = "https://pbs.twimg.com/media/photo.jpg?name=small";
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  let service: TweetImageService;
  let requested: Request[];

  const serve = (respond: (index: number) => Response) => {
    server.use(
      http.get(/^https:\/\/pbs\.twimg\.com\//u, ({ request }) => {
        requested.push(request.clone());

        return respond(requested.length - 1);
      }),
    );
  };

  beforeAll(() => {
    server.listen({ onUnhandledFrame: "error" });
  });

  beforeEach(() => {
    service = new TweetImageService(new TwimgImageGateway());
    requested = [];
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("loads an allowlisted image without a Referer and without following other hosts", async () => {
    serve(() => image(jpeg));

    const result = await service.load(imageUrl);

    expect(result).toStrictEqual({ body: Buffer.from(jpeg), contentType: "image/jpeg" });
    expect(requested.map(({ url }) => url)).toStrictEqual([imageUrl]);
    expect(requested[0]?.headers.has("referer")).toBe(false);
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
    expect(requested).toHaveLength(0);
  });

  it("follows a redirect that stays on the allowlisted host", async () => {
    const next = "https://pbs.twimg.com/media/photo.jpg?name=orig";
    serve((index) => (index === 0 ? redirect(next) : image(jpeg)));

    await expect(service.load(imageUrl)).resolves.toMatchObject({ contentType: "image/jpeg" });
    expect(requested[1]?.url).toBe(next);
  });

  it("keeps a protocol-relative looking path on the allowlisted host", async () => {
    serve(() => image(jpeg));

    await service.load("https://pbs.twimg.com//evil.example/photo.jpg#frag");

    expect(requested[0]?.url).toBe("https://pbs.twimg.com//evil.example/photo.jpg");
  });

  it("resolves a relative redirect against the allowlisted host", async () => {
    serve((index) => (index === 0 ? redirect("/media/photo.jpg?name=orig") : image(jpeg)));

    await expect(service.load(imageUrl)).resolves.toMatchObject({ contentType: "image/jpeg" });
    expect(requested[1]?.url).toBe("https://pbs.twimg.com/media/photo.jpg?name=orig");
  });

  it.each([
    "https://evil.example/photo.jpg",
    "http://pbs.twimg.com/media/photo.jpg",
    "//evil.example/photo.jpg",
    "https://pbs.twimg.com@evil.example/photo.jpg",
    "",
  ])("rejects a redirect to %j", async (location) => {
    serve(() => redirect(location === "" ? null : location, 301));

    await expect(service.load(imageUrl)).rejects.toBeInstanceOf(IntegrationError);
    expect(requested).toHaveLength(1);
  });

  it("stops after too many redirects", async () => {
    serve(() => redirect(imageUrl));

    await expect(service.load(imageUrl)).rejects.toBeInstanceOf(IntegrationError);
    expect(requested).toHaveLength(3);
  });

  it.each(["text/html", "image/svg+xml", "application/octet-stream", ""])(
    "rejects a %j response",
    async (contentType) => {
      serve(() => image("<svg/>", { headers: { "content-type": contentType } }));

      await expect(service.load(imageUrl)).rejects.toBeInstanceOf(IntegrationError);
    },
  );

  it("rejects images over the size limit, declared or streamed", async () => {
    const tooLarge = new Uint8Array(5 * 1024 * 1024 + 1);
    serve((index) =>
      index === 0
        ? image(jpeg, { headers: { "content-length": "6000000", "content-type": "image/jpeg" } })
        : image(tooLarge),
    );

    await expect(service.load(imageUrl)).rejects.toBeInstanceOf(IntegrationError);
    await expect(service.load(imageUrl)).rejects.toBeInstanceOf(IntegrationError);
  });

  it.each([404, 410])("reports an image removed from X (%i) as not found", async (status) => {
    serve(() => image(null, { status }));

    await expect(service.load(imageUrl)).rejects.toBeInstanceOf(NotFoundError);
  });

  it.each([403, 500, 503])("reports an upstream %i as an integration failure", async (status) => {
    serve(() => image(null, { status }));

    await expect(service.load(imageUrl)).rejects.toBeInstanceOf(IntegrationError);
  });

  it("reports network failures as integration failures", async () => {
    serve(() => HttpResponse.error());

    await expect(service.load(imageUrl)).rejects.toBeInstanceOf(IntegrationError);
  });
});
