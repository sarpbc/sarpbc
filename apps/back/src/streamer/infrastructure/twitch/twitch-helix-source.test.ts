import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TwitchAppToken } from "./twitch-app-token";
import { ROCKET_LEAGUE_GAME_ID, TwitchHelixSource } from "./twitch-helix-source";

const helixStream = (login: string, gameId = ROCKET_LEAGUE_GAME_ID) => ({
  user_login: login,
  user_name: login.toUpperCase(),
  game_id: gameId,
  type: "live",
  title: `${login} live`,
  viewer_count: 42,
});

const streamsResponse = (data: unknown[], status = 200) => Response.json({ data }, { status });

const requestedUrl = (call: Parameters<typeof fetch>): URL => {
  const [input] = call;

  if (!(input instanceof URL)) {
    throw new TypeError("Expected a URL request");
  }

  return input;
};

const requestedLogins = (call: Parameters<typeof fetch>): string[] =>
  requestedUrl(call).searchParams.getAll("user_login");

describe(TwitchHelixSource, () => {
  const fetchMock = vi.fn<typeof fetch>();
  let token = new TwitchAppToken({ clientId: "client", clientSecret: "secret" });
  let source = new TwitchHelixSource("client", token);
  let tokenGet = vi.spyOn(token, "get");
  let tokenInvalidate = vi.spyOn(token, "invalidate");

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    token = new TwitchAppToken({ clientId: "client", clientSecret: "secret" });
    tokenGet = vi.spyOn(token, "get").mockResolvedValue("app-token");
    tokenInvalidate = vi.spyOn(token, "invalidate");
    source = new TwitchHelixSource("client", token);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sends the client id and app token", async () => {
    fetchMock.mockResolvedValueOnce(streamsResponse([]));

    await source.findLiveRocketLeague(["zenrll"]);

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const url = requestedUrl(fetchMock.mock.calls[0] ?? []);
    expect(`${url.origin}${url.pathname}`).toBe("https://api.twitch.tv/helix/streams");
    expect(init?.headers).toStrictEqual({
      "Client-Id": "client",
      Authorization: "Bearer app-token",
    });
  });

  it("queries logins in batches of 100", async () => {
    const logins = Array.from({ length: 250 }, (_, index) => `player_${index}`);
    fetchMock.mockImplementation(async () => streamsResponse([]));

    await source.findLiveRocketLeague(logins);

    const { calls } = fetchMock.mock;
    expect(calls.map((call) => requestedLogins(call).length)).toStrictEqual([100, 100, 50]);
    expect(calls.flatMap(requestedLogins)).toStrictEqual(logins);
  });

  it("keeps only Rocket League streams", async () => {
    fetchMock.mockResolvedValueOnce(
      streamsResponse([helixStream("zenrll"), helixStream("kaydop", "509658")]),
    );

    await expect(source.findLiveRocketLeague(["zenrll", "kaydop"])).resolves.toStrictEqual([
      {
        login: "zenrll",
        displayName: "ZENRLL",
        title: "zenrll live",
        viewerCount: 42,
      },
    ]);
  });

  it("refreshes the token once and retries after a 401", async () => {
    tokenGet.mockResolvedValueOnce("expired").mockResolvedValueOnce("fresh");
    fetchMock
      .mockResolvedValueOnce(streamsResponse([], 401))
      .mockResolvedValueOnce(streamsResponse([helixStream("zenrll")]));

    await expect(source.findLiveRocketLeague(["zenrll"])).resolves.toHaveLength(1);
    expect(tokenInvalidate).toHaveBeenCalledWith("expired");
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({ Authorization: "Bearer fresh" });
  });

  it("fails when Helix returns an error", async () => {
    fetchMock.mockResolvedValueOnce(streamsResponse([], 503));

    await expect(source.findLiveRocketLeague(["zenrll"])).rejects.toThrow("status 503");
  });

  it("rejects a malformed Helix response", async () => {
    fetchMock.mockResolvedValueOnce(streamsResponse([{ user_login: "zenrll" }]));

    await expect(source.findLiveRocketLeague(["zenrll"])).rejects.toThrow(/user_name/u);
  });
});
