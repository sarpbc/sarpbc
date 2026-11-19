import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TwitchAppToken } from "./twitch-app-token";

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";

const tokenResponse = (accessToken: string, expiresIn = 3600) =>
  HttpResponse.json({ access_token: accessToken, expires_in: expiresIn });

describe(TwitchAppToken, () => {
  const server = setupServer();
  let now: number;
  let token: TwitchAppToken;
  let requests: Request[];

  const serve = (...responses: Response[]) => {
    server.use(
      http.post(TOKEN_URL, ({ request }) => {
        requests.push(request.clone());

        return responses.shift() ?? HttpResponse.error();
      }),
    );
  };

  beforeAll(() => {
    server.listen({ onUnhandledFrame: "error" });
  });

  beforeEach(() => {
    now = Date.parse("2026-10-31T20:00:00Z");
    requests = [];
    token = new TwitchAppToken({ clientId: "client", clientSecret: "secret" }, () => now);
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("requests a client credentials token", async () => {
    serve(tokenResponse("first"));

    await expect(token.get()).resolves.toBe("first");
    const [request] = requests;

    expect(Object.fromEntries(new URLSearchParams(await request?.text()))).toStrictEqual({
      client_id: "client",
      client_secret: "secret",
      grant_type: "client_credentials",
    });
  });

  it("reuses the cached token until shortly before expiry", async () => {
    serve(tokenResponse("first", 3600), tokenResponse("second", 3600));

    await token.get();
    now += 30 * 60_000;
    await expect(token.get()).resolves.toBe("first");
    now += 26 * 60_000;
    await expect(token.get()).resolves.toBe("second");
    expect(requests).toHaveLength(2);
  });

  it("reuses a short-lived token for half of its lifetime", async () => {
    serve(tokenResponse("first", 120), tokenResponse("second", 120));

    await token.get();
    now += 59_000;
    await expect(token.get()).resolves.toBe("first");
    now += 1000;
    await expect(token.get()).resolves.toBe("second");
    expect(requests).toHaveLength(2);
  });

  it("shares one request between concurrent callers", async () => {
    serve(tokenResponse("first"));

    await expect(Promise.all([token.get(), token.get()])).resolves.toStrictEqual([
      "first",
      "first",
    ]);
    expect(requests).toHaveLength(1);
  });

  it("requests a new token after the current one is rejected", async () => {
    serve(tokenResponse("first"), tokenResponse("second"));

    await token.get();
    token.invalidate("first");
    await expect(token.get()).resolves.toBe("second");
  });

  it("keeps a newer token when an older one is reported as rejected", async () => {
    serve(tokenResponse("first"));

    await token.get();
    token.invalidate("older");
    await expect(token.get()).resolves.toBe("first");
    expect(requests).toHaveLength(1);
  });

  it("fails without caching when Twitch refuses the credentials", async () => {
    serve(HttpResponse.json({}, { status: 403 }), tokenResponse("first"));

    await expect(token.get()).rejects.toThrow("status 403");
    await expect(token.get()).resolves.toBe("first");
  });
});
