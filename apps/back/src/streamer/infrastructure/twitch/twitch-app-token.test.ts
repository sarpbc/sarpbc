import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TwitchAppToken } from "./twitch-app-token";

function tokenResponse(accessToken: string, expiresIn = 3600) {
  return Response.json({ access_token: accessToken, expires_in: expiresIn });
}

describe(TwitchAppToken, () => {
  const fetchMock = vi.fn<typeof fetch>();
  let now: number;
  let token: TwitchAppToken;

  beforeEach(() => {
    now = Date.parse("2026-10-31T20:00:00Z");
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    token = new TwitchAppToken({ clientId: "client", clientSecret: "secret" }, () => now);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests a client credentials token", async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse("first"));

    await expect(token.get()).resolves.toBe("first");
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    const body = init?.body;

    if (!(body instanceof URLSearchParams)) throw new Error("Expected a form-encoded body");

    expect(url).toBe("https://id.twitch.tv/oauth2/token");
    expect(init?.method).toBe("POST");
    expect(Object.fromEntries(body)).toEqual({
      client_id: "client",
      client_secret: "secret",
      grant_type: "client_credentials",
    });
  });

  it("reuses the cached token until shortly before expiry", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse("first", 3600))
      .mockResolvedValueOnce(tokenResponse("second", 3600));

    await token.get();
    now += 30 * 60_000;
    await expect(token.get()).resolves.toBe("first");
    now += 26 * 60_000;
    await expect(token.get()).resolves.toBe("second");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reuses a short-lived token for half of its lifetime", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse("first", 120))
      .mockResolvedValueOnce(tokenResponse("second", 120));

    await token.get();
    now += 59_000;
    await expect(token.get()).resolves.toBe("first");
    now += 1000;
    await expect(token.get()).resolves.toBe("second");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shares one request between concurrent callers", async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse("first"));

    await expect(Promise.all([token.get(), token.get()])).resolves.toEqual(["first", "first"]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("requests a new token after the current one is rejected", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse("first"))
      .mockResolvedValueOnce(tokenResponse("second"));

    await token.get();
    token.invalidate("first");
    await expect(token.get()).resolves.toBe("second");
  });

  it("keeps a newer token when an older one is reported as rejected", async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse("first"));

    await token.get();
    token.invalidate("older");
    await expect(token.get()).resolves.toBe("first");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("fails without caching when Twitch refuses the credentials", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({}, { status: 403 }))
      .mockResolvedValueOnce(tokenResponse("first"));

    await expect(token.get()).rejects.toThrow("status 403");
    await expect(token.get()).resolves.toBe("first");
  });
});
