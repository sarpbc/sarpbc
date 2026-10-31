import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { TwitchAppToken } from "./twitch-app-token";

function tokenResponse(accessToken: string, expiresIn = 3600) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ access_token: accessToken, expires_in: expiresIn }),
  };
}

describe("TwitchAppToken", () => {
  let now: number;
  let token: TwitchAppToken;

  beforeEach(() => {
    now = Date.parse("2026-10-31T20:00:00Z");
    global.fetch = vi.fn();
    token = new TwitchAppToken({ clientId: "client", clientSecret: "secret" }, () => now);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("requests a client credentials token", async () => {
    (global.fetch as Mock).mockResolvedValueOnce(tokenResponse("first"));

    await expect(token.get()).resolves.toBe("first");
    const [url, init] = (global.fetch as Mock).mock.calls[0];
    expect(url).toBe("https://id.twitch.tv/oauth2/token");
    expect(init.method).toBe("POST");
    expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
      client_id: "client",
      client_secret: "secret",
      grant_type: "client_credentials",
    });
  });

  it("reuses the cached token until shortly before expiry", async () => {
    (global.fetch as Mock)
      .mockResolvedValueOnce(tokenResponse("first", 3600))
      .mockResolvedValueOnce(tokenResponse("second", 3600));

    await token.get();
    now += 30 * 60_000;
    await expect(token.get()).resolves.toBe("first");
    now += 26 * 60_000;
    await expect(token.get()).resolves.toBe("second");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("shares one request between concurrent callers", async () => {
    (global.fetch as Mock).mockResolvedValueOnce(tokenResponse("first"));

    await expect(Promise.all([token.get(), token.get()])).resolves.toEqual(["first", "first"]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("requests a new token after the current one is rejected", async () => {
    (global.fetch as Mock)
      .mockResolvedValueOnce(tokenResponse("first"))
      .mockResolvedValueOnce(tokenResponse("second"));

    await token.get();
    token.invalidate("first");
    await expect(token.get()).resolves.toBe("second");
  });

  it("keeps a newer token when an older one is reported as rejected", async () => {
    (global.fetch as Mock).mockResolvedValueOnce(tokenResponse("first"));

    await token.get();
    token.invalidate("older");
    await expect(token.get()).resolves.toBe("first");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("fails without caching when Twitch refuses the credentials", async () => {
    (global.fetch as Mock)
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) })
      .mockResolvedValueOnce(tokenResponse("first"));

    await expect(token.get()).rejects.toThrow("status 403");
    await expect(token.get()).resolves.toBe("first");
  });
});
