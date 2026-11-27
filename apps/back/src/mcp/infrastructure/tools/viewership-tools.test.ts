import { describe, expect, it, vi } from "vitest";
import type { StaffRole } from "@sarpbc/types";
import { z } from "zod";
import type { ToolArguments } from "../define-tool";
import { jsonOf } from "../../../../test/mcp-result";
import { FakeRosterProposals } from "./roster-proposals.test-utils";
import { rosterTools } from "./roster-tools";

const MATCH_ID = "0b6e3d8a-1f2c-4e5d-8a9b-7c6d5e4f3a2b";
const SOURCE = "https://escharts.com/tournaments/rl/fake-open";

const INPUT = {
  peakViewers: 48_000,
  scope: "official",
  sourceName: "Esports Charts",
  sourceUrl: SOURCE,
};

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

describe("viewership tools", () => {
  it.each([
    ["event", "eventId", "set_event_viewership"],
    ["match", "matchId", "set_match_viewership"],
  ])("queues a %s proposal credited to its sourceUrl", async (target, idField, kind) => {
    vi.stubEnv("ADMIN_URL", "https://admin.sarpbc.test");
    const { call, rosterProposalService } = setup("set_viewership");

    const result = await call({ id: MATCH_ID, target, ...INPUT, averageViewers: 30_000 });

    expect(rosterProposalService.changes).toStrictEqual([
      {
        change: {
          [idField]: MATCH_ID,
          kind,
          viewership: {
            averageViewers: 30_000,
            measuredAt: null,
            peakViewers: 48_000,
            scope: "official",
            sourceName: "Esports Charts",
            sourceUrl: SOURCE,
          },
        },
        proposedById: "u1",
        sourceUrl: SOURCE,
      },
    ]);
    expect(jsonOf(result)).toMatchObject({
      kind,
      status: "pending",
    });
  });

  it("requires an https sourceUrl outside Liquipedia, BLAST.tv and start.gg, and a source name", () => {
    const schema = z.object(setup("set_viewership").tool.inputSchema);
    const input = { id: MATCH_ID, target: "match", ...INPUT };
    expect(schema.safeParse(input).success).toBe(true);

    for (const invalid of [
      { sourceUrl: undefined },
      { sourceUrl: "http://escharts.com/tournaments/rl/fake-open" },
      { sourceUrl: "https://liquipedia.net/rocketleague/Fake_Open" },
      { sourceUrl: "https://blast.tv/rl/fake-open" },
      { sourceUrl: "https://www.start.gg/tournament/fake-open" },
      { sourceName: undefined },
      { sourceName: " " },
      { peakViewers: -1 },
      { scope: "replay" },
    ]) {
      expect(schema.safeParse({ ...input, ...invalid }).success).toBe(false);
    }
  });

  it("requires tournaments.manage", async () => {
    const { call, rosterProposalService } = setup("set_viewership", "journalist");
    const result = await call({ id: MATCH_ID, target: "match", ...INPUT });
    expect(result.isError).toBe(true);
    expect(rosterProposalService.changes).toStrictEqual([]);
  });
});
