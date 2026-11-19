import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TwitchAppToken } from "./twitch-app-token";
import { ROCKET_LEAGUE_GAME_ID, TwitchHelixSource } from "./twitch-helix-source";

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const STREAMS_URL = "https://api.twitch.tv/helix/streams";

const helixStream = (login: string, gameId = ROCKET_LEAGUE_GAME_ID) => ({
  game_id: gameId,
  title: `${login} live`,
  type: "live",
  user_login: login,
  user_name: login.toUpperCase(),
  viewer_count: 42,
});

const streamsResponse = (data: unknown[], status = 200) => HttpResponse.json({ data }, { status });

const requestedLogins = (request: Request) =>
  new URL(request.url).searchParams.getAll("user_login");

describe(TwitchHelixSource, () => {
  const server = setupServer();
  let source: TwitchHelixSource;
  let issuedTokens: string[];
  let streamRequests: Request[];

  const serveTokens = (...tokens: string[]) => {
    issuedTokens = [...tokens];
  };

  const serveStreams = (...responses: Response[]) => {
    server.use(
      http.get(STREAMS_URL, ({ request }) => {
        streamRequests.push(request.clone());

        return responses.shift() ?? streamsResponse([]);
      }),
    );
  };

  beforeAll(() => {
    server.listen({ onUnhandledFrame: "error" });
  });

  beforeEach(() => {
    streamRequests = [];
    serveTokens("app-token");
    server.use(
      http.post(TOKEN_URL, () =>
        HttpResponse.json({ access_token: issuedTokens.shift() ?? "unexpected", expires_in: 3600 }),
      ),
    );
    source = new TwitchHelixSource(
      "client",
      new TwitchAppToken({ clientId: "client", clientSecret: "secret" }),
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("sends the client id and app token", async () => {
    serveStreams(streamsResponse([]));

    await source.findLiveRocketLeague(["zenrll"]);

    const [request] = streamRequests;
    expect(request?.headers.get("Authorization")).toBe("Bearer app-token");
    expect(request?.headers.get("Client-Id")).toBe("client");
  });

  it("queries logins in batches of 100", async () => {
    const logins = Array.from({ length: 250 }, (_, index) => `player_${index}`);
    serveStreams();

    await source.findLiveRocketLeague(logins);

    expect(streamRequests.map((request) => requestedLogins(request).length)).toStrictEqual([
      100, 100, 50,
    ]);
    expect(streamRequests.flatMap(requestedLogins)).toStrictEqual(logins);
  });

  it("keeps only Rocket League streams", async () => {
    serveStreams(streamsResponse([helixStream("zenrll"), helixStream("kaydop", "509658")]));

    await expect(source.findLiveRocketLeague(["zenrll", "kaydop"])).resolves.toStrictEqual([
      {
        displayName: "ZENRLL",
        login: "zenrll",
        title: "zenrll live",
        viewerCount: 42,
      },
    ]);
  });

  it("refreshes the token once and retries after a 401", async () => {
    serveTokens("expired", "fresh");
    serveStreams(streamsResponse([], 401), streamsResponse([helixStream("zenrll")]));

    await expect(source.findLiveRocketLeague(["zenrll"])).resolves.toHaveLength(1);
    expect(streamRequests.map((request) => request.headers.get("Authorization"))).toStrictEqual([
      "Bearer expired",
      "Bearer fresh",
    ]);
  });

  it("fails when Helix returns an error", async () => {
    serveStreams(streamsResponse([], 503));

    await expect(source.findLiveRocketLeague(["zenrll"])).rejects.toThrow("status 503");
  });

  it("rejects a malformed Helix response", async () => {
    serveStreams(streamsResponse([{ user_login: "zenrll" }]));

    await expect(source.findLiveRocketLeague(["zenrll"])).rejects.toThrow(/user_name/u);
  });
});
