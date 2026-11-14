import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigService } from "@nestjs/config";
import { requestUrl } from "../../../test/fetch-mock";
import { PandascoreApiClient } from "./pandascore-api.client";
import { PandascoreCompetitionFeed } from "./pandascore-competition-feed";

interface StandingRow {
  rank: number;
  team?: { id: number; name: string };
  player?: { id: number };
}

function respond(status: number, body: StandingRow[] | { error: string }) {
  return Response.json(body, { status });
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

    await expect(feed.getTournamentStandings(42)).resolves.toStrictEqual([
      { teamPandascoreId: 8, rank: 1 },
      { teamPandascoreId: 9, rank: 3 },
      { teamPandascoreId: 10, rank: 3 },
    ]);
    expect(requestUrl(fetch.mock.calls[0]?.[0])).toContain("/tournaments/42/standings");
  });

  it("returns no standings for a tournament PandaScore has none for", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(respond(404, { error: "Not found" }));

    await expect(feed.getTournamentStandings(42)).resolves.toStrictEqual([]);
  });

  it("reports standings as unavailable instead of failing the sync on a plan refusal", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(respond(403, { error: "Forbidden" }));

    await expect(feed.getTournamentStandings(42)).resolves.toBeNull();
  });
});
