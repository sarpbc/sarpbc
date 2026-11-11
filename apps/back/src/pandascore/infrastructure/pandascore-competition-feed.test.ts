import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigService } from "@nestjs/config";
import { PandascoreApiClient } from "./pandascore-api.client";
import { PandascoreCompetitionFeed } from "./pandascore-competition-feed";

interface StandingRow {
  rank: number;
  team?: { id: number; name: string };
  player?: { id: number };
}

function respond(status: number, body: StandingRow[] | { error: string }) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("PandascoreCompetitionFeed standings", () => {
  const client = new PandascoreApiClient(new ConfigService({ pandascore_api_token: "token" }));
  const feed = new PandascoreCompetitionFeed(client);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps team ranks and skips entries without a team", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      respond(200, [
        { rank: 1, team: { id: 8, name: "Winner" } },
        { rank: 3, team: { id: 9, name: "Third" } },
        { rank: 3, team: { id: 10, name: "Also third" } },
        { rank: 5, player: { id: 77 } },
      ]),
    );

    expect(await feed.getTournamentStandings(42)).toEqual([
      { teamPandascoreId: 8, rank: 1 },
      { teamPandascoreId: 9, rank: 3 },
      { teamPandascoreId: 10, rank: 3 },
    ]);
    expect(String(fetch.mock.calls[0]?.[0])).toContain("/tournaments/42/standings");
  });

  it("returns no standings for a tournament PandaScore has none for", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(respond(404, { error: "Not found" }));

    expect(await feed.getTournamentStandings(42)).toEqual([]);
  });
});
