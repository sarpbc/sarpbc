import { describe, expect, it, vi } from "vitest";
import type { RosterChange, SeasonDetail, StaffRole } from "@sarpbc/types";
import { z } from "zod";
import { rosterTools } from "./roster-tools";
import { seasonTools } from "./season-tools";

const SEASON_ID = "6e2f3a4b-5c6d-4e7f-8a9b-0c1d2e3f4a5b";
const PLAYER_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const ANNOUNCEMENT = "https://x.com/RLEsports/status/1";
const user = (role: StaffRole) => ({ id: "u1", email: "staff@test.com", role });

function awardTool() {
  const rosterProposalService = {
    propose: vi.fn().mockImplementation(async (change: RosterChange) => ({
      id: "proposal-1",
      status: "pending",
      change,
    })),
    proposeTeamLogo: vi.fn(),
    list: vi.fn(),
  };
  const tool = rosterTools({ rosterProposalService }).find(
    (candidate) => candidate.name === "propose_season_award",
  );
  if (!tool) throw new Error("propose_season_award is not defined");
  return { rosterProposalService, tool };
}

function parsed(result: { content: { type: string; text?: string }[] }) {
  const block = result.content[0];
  return JSON.parse(block?.type === "text" && block.text ? block.text : "null");
}

describe("propose_season_award", () => {
  const input = {
    seasonId: SEASON_ID,
    playerId: PLAYER_ID,
    awardType: "regional_mvp",
    region: "Europe",
    sourceUrl: ANNOUNCEMENT,
  };

  it("queues a proposal with the announcement instead of writing the award", async () => {
    vi.stubEnv("ADMIN_URL", "https://admin.sarpbc.test");
    const { tool, rosterProposalService } = awardTool();

    const result = await tool.run(user("admin"), input);

    expect(rosterProposalService.propose).toHaveBeenCalledExactlyOnceWith(
      {
        kind: "award_season_player",
        seasonId: SEASON_ID,
        playerId: PLAYER_ID,
        awardType: "regional_mvp",
        region: "Europe",
        presentedBy: undefined,
      },
      ANNOUNCEMENT,
      "u1",
    );
    expect(parsed(result)).toMatchObject({ kind: "award_season_player", status: "pending" });
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
    expect(rosterProposalService.propose).not.toHaveBeenCalled();
  });
});

describe("get_season", () => {
  it("returns the awards with a link to each player and leaves the archive out", async () => {
    vi.stubEnv("FRONT_URL", "https://sarpbc.test");
    const detail: SeasonDetail = {
      id: SEASON_ID,
      name: "RLCS 2024",
      slug: "rlcs-2024",
      format: { summary: "Splits and a World Championship.", phases: [] },
      winnerTeamId: null,
      participants: [
        {
          id: "participant-1",
          team: { id: "t1", name: "Team", slug: "team", imageUrl: null, darkModeImageUrl: null },
          pathNote: null,
          path: [
            {
              id: "entry-1",
              label: "Open qualifier",
              result: "1st",
              tournament: {
                id: "s1",
                name: "Open",
                slug: "open",
                source: "startgg",
                event: { id: "e1", slug: "open", name: "Open" },
              },
            },
          ],
        },
      ],
      awards: [
        {
          id: "award-1",
          awardType: "season_mvp",
          region: null,
          presentedBy: "Ally",
          sourceUrl: ANNOUNCEMENT,
          player: { id: PLAYER_ID, name: "ExoTiiK", slug: "exotiik" },
        },
      ],
    };
    const tool = seasonTools({
      seasonService: { list: vi.fn(), detail: vi.fn(async () => detail) },
    }).find((candidate) => candidate.name === "get_season");
    if (!tool) throw new Error("get_season is not defined");

    const body = parsed(await tool.run(user("journalist"), { id: SEASON_ID }));

    expect(Object.keys(body).sort()).toEqual(["awards", "id", "name"]);
    expect(body.awards[0]).toMatchObject({
      presentedBy: "Ally",
      player: { slug: "exotiik", url: "https://sarpbc.test/player/exotiik" },
    });
  });
});
