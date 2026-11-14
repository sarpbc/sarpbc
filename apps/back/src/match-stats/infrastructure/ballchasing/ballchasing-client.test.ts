import { describe, expect, it, vi } from "vitest";
import { requestUrl } from "../../../../test/fetch-mock";
import { IntegrationError } from "../../../common/domain/errors/integration-error";
import { BALLCHASING_API_URL, BallchasingClient } from "./ballchasing-client";

// Shapes follow the examples of https://ballchasing.com/doc/api (GET /groups/{id}, GET /replays, GET /groups).
function listedReplay(id: string, overrides: { date?: string; date_has_tz?: boolean } = {}) {
  return {
    id,
    link: `${BALLCHASING_API_URL}/replays/${id}`,
    rocket_league_id: `RL-${id}`,
    replay_title: `Game ${id}`,
    map_code: "stadium_p",
    playlist_id: "private",
    duration: 300,
    overtime: false,
    season: 14,
    date: "2026-06-01T20:05:00+02:00",
    date_has_tz: true,
    visibility: "public",
    created: "2026-06-01T20:30:00Z",
    uploader: { steam_id: "1", name: "Uploader", profile_url: "", avatar: "" },
    groups: [{ id: "pilot", name: "Pilot", link: "" }],
    blue: {
      name: "KARMINE CORP",
      goals: 3,
      players: [
        {
          start_time: 0,
          end_time: 300,
          name: "Vatira",
          id: { platform: "epic", id: "a" },
          score: 500,
        },
        {
          start_time: 0,
          end_time: 300,
          name: "Atow",
          id: { platform: "steam", id: "b" },
          score: 300,
        },
      ],
    },
    orange: {
      name: "BDS",
      players: [
        { start_time: 0, end_time: 300, name: "Seikoo", id: { platform: "epic", id: "c" } },
      ],
    },
    ...overrides,
  };
}

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function json(
  body: Record<string, Json>,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return Response.json(body, { status, headers });
}

function client(routes: (url: string) => Response) {
  const fetch = vi.fn<typeof globalThis.fetch>(async (input) => routes(requestUrl(input)));
  let clock = 0;

  const sleep = vi.fn(async (ms: number) => {
    clock += ms;
  });

  const instance = new BallchasingClient("secret-key", {
    fetch,
    sleep,
    now: () => clock,
  });

  return { instance, fetch, sleep, advance: (ms: number) => (clock += ms) };
}

describe("BallchasingClient.groupReplays", () => {
  it("walks nested child groups and every page, with the raw key in Authorization", async () => {
    const { instance, fetch } = client((url) => {
      const parsed = new URL(url);
      const group = parsed.searchParams.get("group");

      if (parsed.pathname === "/api/groups/pilot") return json({ id: "pilot", name: "Pilot" });

      if (
        parsed.pathname === "/api/replays" &&
        group === "pilot" &&
        !parsed.searchParams.has("after")
      )
        return json({
          count: 2,
          list: [listedReplay("r1")],
          next: `${BALLCHASING_API_URL}/replays?after=r1&count=200&group=pilot`,
        });

      if (parsed.pathname === "/api/replays" && group === "pilot")
        return json({ count: 2, list: [listedReplay("r2")] });

      if (parsed.pathname === "/api/groups" && group === "pilot")
        return json({ list: [{ id: "pilot-day-2" }] });

      if (parsed.pathname === "/api/replays" && group === "pilot-day-2")
        return json({
          count: 1,
          list: [
            listedReplay("r3", { date_has_tz: false, date: "2026-06-02T18:00:00" }),
            listedReplay("r1"),
          ],
        });

      if (parsed.pathname === "/api/groups" && group === "pilot-day-2")
        return json({ list: [{ id: "pilot" }] });

      return json({ error: "not found" }, 404);
    });

    const replays = await instance.groupReplays("pilot");

    expect(replays.map((replay) => replay.id)).toEqual(["r1", "r2", "r3"]);
    expect(replays[0]).toEqual({
      id: "r1",
      rocketLeagueId: "RL-r1",
      title: "Game r1",
      playedAt: new Date("2026-06-01T18:05:00Z"),
      playedAtHasTimezone: true,
      blue: { name: "KARMINE CORP", goals: 3, playerNames: ["Vatira", "Atow"] },
      orange: { name: "BDS", goals: 0, playerNames: ["Seikoo"] },
    });
    expect(replays[2]).toMatchObject({
      playedAt: new Date("2026-06-02T18:00:00Z"),
      playedAtHasTimezone: false,
    });

    for (const [, init] of fetch.mock.calls)
      expect(init?.headers).toEqual({ Authorization: "secret-key" });
    expect(new URL(requestUrl(fetch.mock.calls[1][0])).searchParams.get("count")).toBe("200");
  });

  it("explains a missing group, a rejected key and an unexpected body", async () => {
    await expect(
      client(() => json({ error: "not found" }, 404)).instance.groupReplays("nope"),
    ).rejects.toThrow(/group does not exist/);
    await expect(
      client(() => json({ error: "invalid api key" }, 401)).instance.groupReplays("pilot"),
    ).rejects.toThrow(/BALLCHASING_API_KEY/);
    await expect(
      client((url) =>
        url.includes("/groups/") ? json({}) : json({ unexpected: true }),
      ).instance.groupReplays("pilot"),
    ).rejects.toThrow(IntegrationError);
  });

  it("refuses to follow a pagination link off the API host", async () => {
    const { instance, fetch } = client((url) =>
      url.includes("/groups/")
        ? json({})
        : json({ list: [], next: "https://evil.example/api/replays?after=x" }),
    );

    await expect(instance.groupReplays("pilot")).rejects.toThrow(IntegrationError);
    expect(fetch.mock.calls.map(([url]) => requestUrl(url))).not.toContain(
      "https://evil.example/api/replays?after=x",
    );
  });

  it("reports an unreachable API", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => {
      throw new TypeError("fetch failed");
    });

    const instance = new BallchasingClient("k", {
      fetch,
      sleep: async () => {},
    });

    await expect(instance.groupReplays("pilot")).rejects.toThrow(/could not be reached/);
  });
});

// Excerpt of a live GET /api/replays/{id} response.
function replayDetail() {
  return {
    id: "r1",
    status: "ok",
    rocket_league_id: "RL-r1",
    title: "Game r1",
    date: "2026-06-01T20:05:00+02:00",
    date_has_timezone: true,
    blue: {
      name: "REBELLION",
      stats: { core: { goals: 2 } },
      players: [
        {
          name: "Firstkiller",
          id: { platform: "steam", id: "76561198327846028" },
          stats: {
            core: { goals: 2, assists: 0, saves: 3, shots: 6 },
            demo: { inflicted: 0, taken: 1 },
          },
        },
        {
          name: "Racer",
          id: { platform: "steam", id: "76561198224723032" },
          stats: {
            core: { goals: 0, assists: 0, saves: 1, shots: 2 },
            demo: { inflicted: 1, taken: 3 },
          },
        },
      ],
    },
    orange: {
      name: "TEAM VITALITY",
      stats: { core: { goals: 0 } },
      players: [
        {
          name: "zen",
          id: { platform: "steam", id: "76561198144145654" },
          stats: {
            core: { goals: 0, assists: 0, saves: 3, shots: 4 },
            demo: { inflicted: 4, taken: 0 },
          },
        },
      ],
    },
  };
}

describe("BallchasingClient.replayStats", () => {
  it("maps the date, team goals and each player's five stats", async () => {
    const { instance, fetch } = client(() => json(replayDetail()));

    await expect(instance.replayStats("r1")).resolves.toEqual({
      rocketLeagueId: "RL-r1",
      playedAt: new Date("2026-06-01T18:05:00Z"),
      blueGoals: 2,
      orangeGoals: 0,
      players: [
        {
          name: "Firstkiller",
          platform: "steam",
          platformId: "76561198327846028",
          side: "blue",
          goals: 2,
          assists: 0,
          saves: 3,
          shots: 6,
          demolitions: 0,
        },
        {
          name: "Racer",
          platform: "steam",
          platformId: "76561198224723032",
          side: "blue",
          goals: 0,
          assists: 0,
          saves: 1,
          shots: 2,
          demolitions: 1,
        },
        {
          name: "zen",
          platform: "steam",
          platformId: "76561198144145654",
          side: "orange",
          goals: 0,
          assists: 0,
          saves: 3,
          shots: 4,
          demolitions: 4,
        },
      ],
    });
    expect(requestUrl(fetch.mock.calls[0][0])).toBe(`${BALLCHASING_API_URL}/replays/r1`);
  });

  it("counts a number omitted inside a stats object as zero", async () => {
    const detail = replayDetail();
    const [firstkiller, racer] = detail.blue.players;

    const { instance } = client(() =>
      json({
        ...detail,
        blue: {
          ...detail.blue,
          players: [{ ...firstkiller, stats: { core: { goals: 2 }, demo: { taken: 1 } } }, racer],
        },
        orange: { ...detail.orange, stats: { core: {} } },
      }),
    );

    const stats = await instance.replayStats("r1");

    expect(stats?.orangeGoals).toBe(0);
    expect(stats?.players[0]).toMatchObject({
      goals: 2,
      assists: 0,
      saves: 0,
      shots: 0,
      demolitions: 0,
    });
  });

  it("refuses a player or team without its stats objects instead of storing zeros", async () => {
    const detail = replayDetail();
    const [firstkiller, racer] = detail.blue.players;

    const withBluePlayer = (player: Record<string, Json>) => ({
      ...detail,
      blue: { ...detail.blue, players: [firstkiller, player] },
    });

    const bodies = [
      withBluePlayer({ name: racer.name, id: racer.id }),
      withBluePlayer({ ...racer, stats: { core: racer.stats.core } }),
      withBluePlayer({ ...racer, stats: { demo: racer.stats.demo } }),
      { ...detail, orange: { name: detail.orange.name, players: detail.orange.players } },
    ];

    await Promise.all(
      bodies.map(async (body) => {
        await expect(client(() => json(body)).instance.replayStats("r1")).rejects.toThrow(
          IntegrationError,
        );
      }),
    );
  });

  it("returns null while Ballchasing is still processing the replay", async () => {
    const { instance } = client(() => json({ id: "r1", status: "pending" }));

    await expect(instance.replayStats("r1")).resolves.toBeNull();
  });

  it("reports a replay that disappeared", async () => {
    const { instance } = client(() => json({ error: "not found" }, 404));

    await expect(instance.replayStats("gone")).rejects.toThrow(/no longer available/);
  });

  it("spaces replay calls 500 ms apart", async () => {
    const { instance, sleep, advance } = client(() => json(replayDetail()));

    await instance.replayStats("a");
    await instance.replayStats("b");
    advance(300);
    await instance.replayStats("c");

    expect(sleep.mock.calls).toEqual([[500], [200]]);
  });
});

describe("BallchasingClient rate limiting", () => {
  it("honours a positive Retry-After", async () => {
    let calls = 0;

    const { instance, sleep } = client(() => {
      calls += 1;

      return calls === 1
        ? json({ error: "rate limited" }, 429, { "retry-after": "7" })
        : json(replayDetail());
    });

    await instance.replayStats("r1");

    expect(sleep.mock.calls).toEqual([[7000]]);
  });

  it("backs off from one second, doubling, when Retry-After is missing or 0", async () => {
    let calls = 0;

    const { instance, sleep } = client(() => {
      calls += 1;

      if (calls === 1) return json({ error: "rate limited" }, 429, { "retry-after": "0" });

      if (calls <= 3) return json({ error: "rate limited" }, 429);

      return json(replayDetail());
    });

    await instance.replayStats("r1");

    expect(sleep.mock.calls).toEqual([[1000], [2000], [4000]]);
  });

  it("fails clearly once the retries are exhausted", async () => {
    const { instance, fetch, sleep } = client(() => json({ error: "rate limited" }, 429));

    await expect(instance.replayStats("r1")).rejects.toThrow(/rate limit reached/);
    expect(fetch).toHaveBeenCalledTimes(6);
    expect(sleep.mock.calls).toEqual([[1000], [2000], [4000], [8000], [16_000]]);
  });
});
