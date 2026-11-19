import { describe, expect, it, vi } from "vitest";
import type { SeasonDetail, StaffRole } from "@sarpbc/types";
import { z } from "zod";
import { jsonOf } from "../../../../test/mcp-result";
import { FakeRosterProposals, proposed } from "./roster-proposals.test-utils";
import { rosterTools } from "./roster-tools";
import { seasonTools } from "./season-tools";

const SEASON_ID = "6e2f3a4b-5c6d-4e7f-8a9b-0c1d2e3f4a5b";
const PLAYER_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const ANNOUNCEMENT = "https://x.com/RLEsports/status/1";
const user = (role: StaffRole) => ({ email: "staff@test.com", id: "u1", role });

const awardTool = () => {
  const rosterProposalService = new FakeRosterProposals();

  const tool = rosterTools({ rosterProposalService }).find(
    (candidate) => candidate.name === "propose_season_award",
  );

  if (!tool) {
    throw new Error("propose_season_award is not defined");
  }

  return { rosterProposalService, tool };
};

describe("propose_season_award", () => {
  const input = {
    awardType: "regional_mvp",
    playerId: PLAYER_ID,
    region: "Europe",
    seasonId: SEASON_ID,
    sourceUrl: ANNOUNCEMENT,
  };

  it("queues a proposal with the announcement instead of writing the award", async () => {
    vi.stubEnv("ADMIN_URL", "https://admin.sarpbc.test");
    const { tool, rosterProposalService } = awardTool();

    const result = await tool.run(user("admin"), input);

    expect(rosterProposalService.changes).toStrictEqual([
      proposed(
        {
          awardType: "regional_mvp",
          kind: "award_season_player",
          playerId: PLAYER_ID,
          presentedBy: undefined,
          region: "Europe",
          seasonId: SEASON_ID,
        },
        ANNOUNCEMENT,
      ),
    ]);
    expect(jsonOf(result)).toMatchObject({ kind: "award_season_player", status: "pending" });
  });

  it("requires a non-Liquipedia sourceUrl and a season award type", () => {
    const schema = z.object(awardTool().tool.inputSchema);

    const accepts = (overrides: Partial<Record<keyof typeof input, string | undefined>>) =>
      schema.safeParse({ ...input, ...overrides }).success;

    expect(accepts({})).toBe(true);
    expect(accepts({ sourceUrl: undefined })).toBe(false);
    expect(accepts({ sourceUrl: "https://liquipedia.net/rocketleague/RLCS/2024" })).toBe(false);
    expect(accepts({ sourceUrl: `${ANNOUNCEMENT}?${"a".repeat(2048)}` })).toBe(false);
    expect(accepts({ awardType: "mvp" })).toBe(false);
  });

  it("requires tournaments.manage", async () => {
    const { tool, rosterProposalService } = awardTool();
    const result = await tool.run(user("journalist"), input);

    expect(result.isError).toBe(true);
    expect(rosterProposalService.changes).toStrictEqual([]);
  });
});

describe("get_season", () => {
  it("returns the awards with a link to each player and leaves the archive out", async () => {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");

    const detail: SeasonDetail = {
      awards: [
        {
          awardType: "season_mvp",
          id: "award-1",
          player: { id: PLAYER_ID, name: "ExoTiiK", slug: "exotiik" },
          presentedBy: "Ally",
          region: null,
          sourceUrl: ANNOUNCEMENT,
        },
      ],
      format: { phases: [], summary: "Splits and a World Championship." },
      id: SEASON_ID,
      name: "RLCS 2024",
      participants: [
        {
          id: "participant-1",
          path: [
            {
              id: "entry-1",
              label: "Open qualifier",
              result: "1st",
              tournament: {
                event: { id: "e1", name: "Open", slug: "open" },
                id: "s1",
                name: "Open",
                slug: "open",
                source: "startgg",
              },
            },
          ],
          pathNote: null,
          team: { darkModeImageUrl: null, id: "t1", imageUrl: null, name: "Team", slug: "team" },
        },
      ],
      slug: "rlcs-2024",
      winnerTeamId: null,
    };

    const tool = seasonTools({
      seasonService: { detail: async () => detail, list: async () => [] },
    }).find((candidate) => candidate.name === "get_season");

    if (!tool) {
      throw new Error("get_season is not defined");
    }

    const body = jsonOf(await tool.run(user("journalist"), { id: SEASON_ID }));

    expect(body).toMatchObject({
      awards: [
        {
          player: { slug: "exotiik", url: "https://sarpbc.test/player/exotiik" },
          presentedBy: "Ally",
        },
      ],
    });
    expect(new Set(Object.keys(z.record(z.string(), z.unknown()).parse(body)))).toStrictEqual(
      new Set(["awards", "id", "name"]),
    );
  });
});
