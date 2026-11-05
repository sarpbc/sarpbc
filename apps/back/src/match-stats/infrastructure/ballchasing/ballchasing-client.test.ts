import { describe, expect, it, vi } from "vitest";
import { IntegrationError } from "../../../common/domain/errors";
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
  body: { [key: string]: Json },
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function client(routes: (url: string) => Response) {
  const fetch = vi.fn<typeof globalThis.fetch>(async (input) => routes(String(input)));
  const sleep = vi.fn(async () => undefined);
  let clock = 0;
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
    expect(new URL(String(fetch.mock.calls[1][0])).searchParams.get("count")).toBe("200");
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
    expect(fetch.mock.calls.map(([url]) => String(url))).not.toContain(
      "https://evil.example/api/replays?after=x",
    );
  });

  it("reports an unreachable API", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => {
      throw new TypeError("fetch failed");
    });
    const instance = new BallchasingClient("k", {
      fetch,
      sleep: async () => undefined,
    });

    await expect(instance.groupReplays("pilot")).rejects.toThrow(/could not be reached/);
  });
});

describe("BallchasingClient.download", () => {
  it("returns the replay bytes", async () => {
    const { instance, fetch } = client(() => new Response(new Uint8Array([1, 2, 3])));

    expect([...(await instance.download("r1"))]).toEqual([1, 2, 3]);
    expect(String(fetch.mock.calls[0][0])).toBe(`${BALLCHASING_API_URL}/replays/r1/file`);
  });

  it("waits out 429 responses, honouring Retry-After, then gives up", async () => {
    let calls = 0;
    const { instance, sleep } = client(() => {
      calls += 1;
      return calls === 1
        ? json({ error: "rate limited" }, 429, { "retry-after": "7" })
        : calls === 2
          ? json({ error: "rate limited" }, 429)
          : new Response(new Uint8Array([9]));
    });

    expect([...(await instance.download("r1"))]).toEqual([9]);
    expect(sleep).toHaveBeenCalledWith(7000);
    expect(sleep).toHaveBeenCalledWith(60_000);

    const limited = client(() => json({ error: "rate limited" }, 429));
    await expect(limited.instance.download("r1")).rejects.toThrow(/rate limit/);
    expect(limited.fetch).toHaveBeenCalledTimes(6);
  });

  it("spaces file downloads one second apart", async () => {
    const { instance, sleep, advance } = client(() => new Response(new Uint8Array([1])));

    await instance.download("a");
    await instance.download("b");
    advance(1500);
    await instance.download("c");

    expect(sleep.mock.calls).toEqual([[1000], [500]]);
  });

  it("reports a replay that disappeared", async () => {
    const { instance } = client(() => json({ error: "not found" }, 404));

    await expect(instance.download("gone")).rejects.toThrow(/no longer available/);
  });
});
