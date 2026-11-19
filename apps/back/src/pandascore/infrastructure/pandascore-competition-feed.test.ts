import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ConfigService } from "@nestjs/config";
import { PandascoreApiClient } from "./pandascore-api.client";
import { PandascoreCompetitionFeed } from "./pandascore-competition-feed";

interface StandingRow {
  rank: number;
  team?: { id: number; name: string };
  player?: { id: number };
}

const STANDINGS_URL = "https://api.pandascore.co/tournaments/42/standings";

const respond = (status: number, body: StandingRow[] | { error: string }) =>
  HttpResponse.json(body, { status });

describe("PandascoreCompetitionFeed standings", () => {
  const server = setupServer();
  const client = new PandascoreApiClient(new ConfigService({ pandascore_api_token: "token" }));
  const feed = new PandascoreCompetitionFeed(client);

  beforeAll(() => {
    server.listen({ onUnhandledFrame: "error" });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("maps team ranks and skips entries without a team", async () => {
    server.use(
      http.get(STANDINGS_URL, () =>
        respond(200, [
          { rank: 1, team: { id: 8, name: "Winner" } },
          { rank: 3, team: { id: 9, name: "Third" } },
          { rank: 3, team: { id: 10, name: "Also third" } },
          { player: { id: 77 }, rank: 5 },
        ]),
      ),
    );

    await expect(feed.getTournamentStandings(42)).resolves.toStrictEqual([
      { rank: 1, teamPandascoreId: 8 },
      { rank: 3, teamPandascoreId: 9 },
      { rank: 3, teamPandascoreId: 10 },
    ]);
  });

  it("returns no standings for a tournament PandaScore has none for", async () => {
    server.use(http.get(STANDINGS_URL, () => respond(404, { error: "Not found" })));

    await expect(feed.getTournamentStandings(42)).resolves.toStrictEqual([]);
  });

  it("reports standings as unavailable instead of failing the sync on a plan refusal", async () => {
    server.use(http.get(STANDINGS_URL, () => respond(403, { error: "Forbidden" })));

    await expect(feed.getTournamentStandings(42)).resolves.toBeNull();
  });
});
