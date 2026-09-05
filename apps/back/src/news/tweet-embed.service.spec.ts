import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { TweetEmbedService } from "./tweet-embed.service";

describe("TweetEmbedService", () => {
  const originalFetch = global.fetch;
  let service: TweetEmbedService;

  beforeEach(() => {
    service = new TweetEmbedService();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("rejects URLs that are not X status posts", async () => {
    await expect(service.embed("https://x.com/RL_Comm")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("maps oEmbed JSON to a tweet card and caches the result", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        author_name: "Comm",
        author_url: "https://twitter.com/RL_Comm",
        html: '<blockquote class="twitter-tweet"><p>This marks the end of my playing career.</p><a href="https://twitter.com/RL_Comm/status/2095971934320071030">September 4, 2026</a></blockquote>',
      }),
    });

    const url = "https://x.com/RL_Comm/status/2095971934320071030";
    const first = await service.embed(url);
    const second = await service.embed(url);

    expect(first.authorHandle).toBe("RL_Comm");
    expect(first.text).toBe("This marks the end of my playing career.");
    expect(second).toEqual(first);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("surfaces a service error when X oEmbed is down", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("network"));

    await expect(
      service.embed("https://x.com/RL_Comm/status/2095971934320071030"),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
