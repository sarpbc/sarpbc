import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { TwitchAppToken } from "./twitch-app-token";
import { ROCKET_LEAGUE_GAME_ID, TwitchHelixSource } from "./twitch-helix-source";

function helixStream(login: string, gameId = ROCKET_LEAGUE_GAME_ID) {
  return {
    user_login: login,
    user_name: login.toUpperCase(),
    game_id: gameId,
    type: "live",
    title: `${login} live`,
    viewer_count: 42,
  };
}

function streamsResponse(data: unknown[], status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => ({ data }) };
}

function requestedLogins(call: unknown[]): string[] {
  return (call[0] as URL).searchParams.getAll("user_login");
}

describe("TwitchHelixSource", () => {
  let token = new TwitchAppToken({ clientId: "client", clientSecret: "secret" });
  let source = new TwitchHelixSource("client", token);

  beforeEach(() => {
    global.fetch = vi.fn();
    token = new TwitchAppToken({ clientId: "client", clientSecret: "secret" });
    vi.spyOn(token, "get").mockResolvedValue("app-token");
    vi.spyOn(token, "invalidate");
    source = new TwitchHelixSource("client", token);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("sends the client id and app token", async () => {
    (global.fetch as Mock).mockResolvedValueOnce(streamsResponse([]));

    await source.findLiveRocketLeague(["zenrll"]);

    const [url, init] = (global.fetch as Mock).mock.calls[0];
    expect(`${(url as URL).origin}${(url as URL).pathname}`).toBe(
      "https://api.twitch.tv/helix/streams",
    );
    expect(init.headers).toEqual({ "Client-Id": "client", Authorization: "Bearer app-token" });
  });

  it("queries logins in batches of 100", async () => {
    const logins = Array.from({ length: 250 }, (_, index) => `player_${index}`);
    (global.fetch as Mock).mockResolvedValue(streamsResponse([]));

    await source.findLiveRocketLeague(logins);

    const calls = (global.fetch as Mock).mock.calls;
    expect(calls.map((call) => requestedLogins(call).length)).toEqual([100, 100, 50]);
    expect(calls.flatMap(requestedLogins)).toEqual(logins);
  });

  it("keeps only Rocket League streams", async () => {
    (global.fetch as Mock).mockResolvedValueOnce(
      streamsResponse([helixStream("zenrll"), helixStream("kaydop", "509658")]),
    );

    await expect(source.findLiveRocketLeague(["zenrll", "kaydop"])).resolves.toEqual([
      {
        login: "zenrll",
        displayName: "ZENRLL",
        title: "zenrll live",
        viewerCount: 42,
      },
    ]);
  });

  it("refreshes the token once and retries after a 401", async () => {
    vi.mocked(token.get).mockResolvedValueOnce("expired").mockResolvedValueOnce("fresh");
    (global.fetch as Mock)
      .mockResolvedValueOnce(streamsResponse([], 401))
      .mockResolvedValueOnce(streamsResponse([helixStream("zenrll")]));

    await expect(source.findLiveRocketLeague(["zenrll"])).resolves.toHaveLength(1);
    expect(token.invalidate).toHaveBeenCalledWith("expired");
    expect((global.fetch as Mock).mock.calls[1][1].headers.Authorization).toBe("Bearer fresh");
  });

  it("fails when Helix returns an error", async () => {
    (global.fetch as Mock).mockResolvedValueOnce(streamsResponse([], 503));

    await expect(source.findLiveRocketLeague(["zenrll"])).rejects.toThrow("status 503");
  });

  it("rejects a malformed Helix response", async () => {
    (global.fetch as Mock).mockResolvedValueOnce(streamsResponse([{ user_login: "zenrll" }]));

    await expect(source.findLiveRocketLeague(["zenrll"])).rejects.toThrow();
  });
});
