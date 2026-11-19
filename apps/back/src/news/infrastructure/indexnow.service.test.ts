import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";
import { IndexNowService } from "./indexnow.service";

const TEST_KEY = "indexnow-nonproduction-test-fixture";
const INDEXNOW_URL = "https://api.indexnow.org/indexnow";

describe(IndexNowService, () => {
  const server = setupServer();
  let requests: Request[];

  const serve = (respond: () => Response) => {
    server.use(
      http.post(INDEXNOW_URL, ({ request }) => {
        requests.push(request.clone());

        return respond();
      }),
    );
  };

  beforeAll(() => {
    server.listen({ onUnhandledFrame: "error" });
  });

  beforeEach(() => {
    requests = [];
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("submits the home page and deduplicated news, in English and French, with a verifiable key location", async () => {
    serve(() => new HttpResponse(null, { status: 202 }));

    const service = new IndexNowService(
      new ConfigService({
        front_url: "https://sarpbc.org/",
        indexnow: { key: TEST_KEY },
        production: true,
      }),
    );

    await service.submitNewsSlugs(["rlcs-final", "rlcs-final"]);
    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(JSON.parse(z.string().parse(await request?.text()))).toStrictEqual({
      host: "sarpbc.org",
      key: TEST_KEY,
      keyLocation: `https://sarpbc.org/${TEST_KEY}.txt`,
      urlList: [
        "https://sarpbc.org/",
        "https://sarpbc.org/fr/",
        "https://sarpbc.org/news/rlcs-final",
        "https://sarpbc.org/fr/news/rlcs-final",
      ],
    });
  });

  it("does not notify search engines during development", async () => {
    serve(() => new HttpResponse(null, { status: 202 }));

    const service = new IndexNowService(
      new ConfigService({ indexnow: { key: TEST_KEY }, production: false }),
    );

    await service.submitNewsSlugs(["draft"]);
    expect(requests).toHaveLength(0);
  });

  it("does not use any default key when production configuration is missing", async () => {
    serve(() => new HttpResponse(null, { status: 202 }));

    const service = new IndexNowService(
      new ConfigService({ front_url: "https://sarpbc.org", production: true }),
    );

    await service.submitNewsSlugs(["rlcs-final"]);
    expect(requests).toHaveLength(0);
  });

  it("keeps saved content successful when IndexNow cannot be reached", async () => {
    serve(() => HttpResponse.error());

    const service = new IndexNowService(
      new ConfigService({
        front_url: "https://sarpbc.org",
        indexnow: { key: TEST_KEY },
        production: true,
      }),
    );

    await expect(service.submitNewsSlugs(["rlcs-final"])).resolves.toBeUndefined();
  });

  it("does not throw when IndexNow rejects a notification", async () => {
    serve(() => new HttpResponse(null, { status: 429 }));

    const service = new IndexNowService(
      new ConfigService({
        front_url: "https://sarpbc.org",
        indexnow: { key: TEST_KEY },
        production: true,
      }),
    );

    await expect(service.submitNewsSlugs(["rlcs-final"])).resolves.toBeUndefined();
  });
});
