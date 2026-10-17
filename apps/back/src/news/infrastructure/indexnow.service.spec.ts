import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigService } from "@nestjs/config";
import { INDEXNOW_KEY } from "@sarpbc/utils";
import { IndexNowService } from "./indexnow.service";

describe("IndexNowService", () => {
  afterEach(() => vi.restoreAllMocks());

  it("submits deduplicated English and French URLs with a verifiable key location", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 202 }));
    const service = new IndexNowService(
      new ConfigService({ production: true, front_url: "https://sarpbc.org/" }),
    );
    await service.submitNewsSlugs(["rlcs-final", "rlcs-final"]);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [endpoint, request] = fetch.mock.calls[0]!;
    expect(endpoint).toBe("https://api.indexnow.org/indexnow");
    expect(request?.method).toBe("POST");
    expect(JSON.parse(String(request?.body))).toEqual({
      host: "sarpbc.org",
      key: INDEXNOW_KEY,
      keyLocation: "https://sarpbc.org/indexnow-key.txt",
      urlList: ["https://sarpbc.org/news/rlcs-final", "https://sarpbc.org/fr/news/rlcs-final"],
    });
  });

  it("does not notify search engines during development", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const service = new IndexNowService(new ConfigService({ production: false }));
    await service.submitNewsSlugs(["draft"]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps saved content successful when IndexNow cannot be reached", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network unavailable"));
    const service = new IndexNowService(
      new ConfigService({ production: true, front_url: "https://sarpbc.org" }),
    );
    await expect(service.submitNewsSlugs(["rlcs-final"])).resolves.toBeUndefined();
  });

  it("does not throw when IndexNow rejects a notification", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 429 }));
    const service = new IndexNowService(
      new ConfigService({ production: true, front_url: "https://sarpbc.org" }),
    );
    await expect(service.submitNewsSlugs(["rlcs-final"])).resolves.toBeUndefined();
  });
});
