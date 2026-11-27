import { describe, expect, it, vi } from "vitest";
import type { StaffRole } from "@sarpbc/types";
import { z } from "zod";
import type { ToolArguments } from "../define-tool";
import { jsonOf } from "../../../../test/mcp-result";
import { FakeRosterProposals } from "./roster-proposals.test-utils";
import { RosterProposal } from "../../../roster-proposal/domain/roster-proposal";
import { rosterTools } from "./roster-tools";

const MATCH_ID = "0b6e3d8a-1f2c-4e5d-8a9b-7c6d5e4f3a2b";
const SOURCE = "https://example.com/fake-cup/broadcast";

const STREAMS = [
  { kind: "official", language: "en", url: "https://twitch.tv/fakecup" },
  { channel: "Fake Cup FR", kind: "costream", language: "fr", url: "https://twitch.tv/fakecup_fr" },
];

const setup = (toolName: string, role: StaffRole = "admin") => {
  const rosterProposalService = new FakeRosterProposals();

  const tool = rosterTools({ rosterProposalService }).find(
    (candidate) => candidate.name === toolName,
  );

  if (!tool) {
    throw new Error(`${toolName} is not defined`);
  }

  const call = async (args: ToolArguments) =>
    await tool.run({ email: "staff@test.com", id: "u1", role }, args);

  return { call, rosterProposalService, tool };
};

describe("stream tools", () => {
  it.each([
    ["event", "eventId", "set_event_streams"],
    ["tournament", "tournamentId", "set_tournament_streams"],
    ["match", "matchId", "set_match_streams"],
  ])("queues a proposal that replaces the whole %s list", async (target, idField, kind) => {
    vi.stubEnv("ADMIN_URL", "https://admin.sarpbc.test");
    const { call, rosterProposalService } = setup("set_streams");

    const result = await call({ id: MATCH_ID, sourceUrl: SOURCE, streams: STREAMS, target });

    expect(rosterProposalService.changes).toStrictEqual([
      {
        change: { [idField]: MATCH_ID, kind, streams: STREAMS },
        proposedById: "u1",
        sourceUrl: SOURCE,
      },
    ]);
    expect(jsonOf(result)).toMatchObject({
      kind,
      status: "pending",
    });
  });

  it("requires a non-Liquipedia sourceUrl and well-formed streams", () => {
    const schema = z.object(setup("set_streams").tool.inputSchema);
    const input = { id: MATCH_ID, sourceUrl: SOURCE, streams: STREAMS, target: "match" };
    expect(schema.safeParse(input).success).toBe(true);
    expect(schema.safeParse({ ...input, sourceUrl: undefined }).success).toBe(false);
    expect(
      schema.safeParse({ ...input, sourceUrl: "https://liquipedia.net/rocketleague/Fake_Cup" })
        .success,
    ).toBe(false);
    expect(schema.safeParse({ ...input, streams: [{ ...STREAMS[0], kind: "vod" }] }).success).toBe(
      false,
    );
    expect(schema.safeParse({ ...input, streams: [] }).success).toBe(true);
  });

  it("requires tournaments.manage", async () => {
    const { call, rosterProposalService } = setup("set_streams", "journalist");

    const result = await call({
      id: MATCH_ID,
      sourceUrl: SOURCE,
      streams: STREAMS,
      target: "match",
    });

    expect(result.isError).toBe(true);
    expect(rosterProposalService.changes).toStrictEqual([]);
  });

  it("hides start.gg sourced stream lists from list_roster_proposals", async () => {
    const { tool: _, rosterProposalService } = setup("set_streams");

    const proposal = (sourceUrl: string) =>
      Object.assign(new RosterProposal(), {
        change: { kind: "set_match_streams", matchId: MATCH_ID, streams: STREAMS },
        createdAt: new Date(0),
        id: sourceUrl,
        sourceUrl,
      });

    rosterProposalService.proposals = {
      names: {},
      proposals: [proposal("https://www.start.gg/tournament/fake"), proposal(SOURCE)],
    };

    const list = rosterTools({ rosterProposalService }).find(
      (candidate) => candidate.name === "list_roster_proposals",
    );

    if (!list) {
      throw new Error("list_roster_proposals is not defined");
    }

    const result = await list.run({ email: "staff@test.com", id: "u1", role: "admin" }, {});
    expect(jsonOf(result)).toMatchObject({
      proposals: [{ change: { streams: [] } }, { change: { streams: STREAMS } }],
    });
  });
});
