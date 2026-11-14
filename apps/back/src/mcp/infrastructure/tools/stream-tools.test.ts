import { describe, expect, it, vi } from "vitest";
import type { StaffRole } from "@sarpbc/types";
import { z } from "zod";
import type { ToolArguments } from "../define-tool";
import { jsonOf, pendingProposalService } from "../../../../test/mcp-result";
import { RosterProposal } from "../../../roster-proposal/domain/roster-proposal";
import { rosterTools } from "./roster-tools";

const MATCH_ID = "0b6e3d8a-1f2c-4e5d-8a9b-7c6d5e4f3a2b";
const SOURCE = "https://example.com/fake-cup/broadcast";

const STREAMS = [
  { url: "https://twitch.tv/fakecup", language: "en", kind: "official" },
  { url: "https://twitch.tv/fakecup_fr", language: "fr", kind: "costream", channel: "Fake Cup FR" },
];

function setup(toolName: string, role: StaffRole = "admin") {
  const rosterProposalService = pendingProposalService();

  const tool = rosterTools({ rosterProposalService }).find(
    (candidate) => candidate.name === toolName,
  );

  if (!tool) throw new Error(`${toolName} is not defined`);

  const call = async (args: ToolArguments) =>
    await tool.run({ id: "u1", email: "staff@test.com", role }, args);

  return { rosterProposalService, tool, call };
}

describe("stream tools", () => {
  it.each([
    ["set_event_streams", "eventId", "set_event_streams"],
    ["set_tournament_streams", "tournamentId", "set_tournament_streams"],
    ["set_match_streams", "matchId", "set_match_streams"],
  ])("%s queues a proposal that replaces the whole list", async (name, idField, kind) => {
    vi.stubEnv("ADMIN_URL", "https://admin.sarpbc.test");
    const { call, rosterProposalService } = setup(name);

    const result = await call({ [idField]: MATCH_ID, streams: STREAMS, sourceUrl: SOURCE });

    expect(rosterProposalService.propose).toHaveBeenCalledExactlyOnceWith(
      { kind, [idField]: MATCH_ID, streams: STREAMS },
      SOURCE,
      "u1",
    );
    expect(jsonOf(result)).toMatchObject({
      kind,
      status: "pending",
    });
  });

  it("requires a non-Liquipedia sourceUrl and well-formed streams", () => {
    const schema = z.object(setup("set_match_streams").tool.inputSchema);
    const input = { matchId: MATCH_ID, streams: STREAMS, sourceUrl: SOURCE };
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
    const { call, rosterProposalService } = setup("set_match_streams", "journalist");
    const result = await call({ matchId: MATCH_ID, streams: STREAMS, sourceUrl: SOURCE });
    expect(result.isError).toBe(true);
    expect(rosterProposalService.propose).not.toHaveBeenCalled();
  });

  it("hides start.gg sourced stream lists from list_roster_proposals", async () => {
    const { tool: _, rosterProposalService } = setup("set_match_streams");

    const proposal = (sourceUrl: string) =>
      Object.assign(new RosterProposal(), {
        id: sourceUrl,
        change: { kind: "set_match_streams", matchId: MATCH_ID, streams: STREAMS },
        sourceUrl,
        createdAt: new Date(0),
      });

    rosterProposalService.list.mockResolvedValue({
      proposals: [proposal("https://www.start.gg/tournament/fake"), proposal(SOURCE)],
      names: {},
    });

    const list = rosterTools({ rosterProposalService }).find(
      (candidate) => candidate.name === "list_roster_proposals",
    );

    if (!list) throw new Error("list_roster_proposals is not defined");

    const result = await list.run({ id: "u1", email: "staff@test.com", role: "admin" }, {});
    expect(jsonOf(result)).toMatchObject({
      proposals: [{ change: { streams: [] } }, { change: { streams: STREAMS } }],
    });
  });
});
