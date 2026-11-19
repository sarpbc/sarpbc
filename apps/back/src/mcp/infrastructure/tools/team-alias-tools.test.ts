import { describe, expect, it, vi } from "vitest";
import type { StaffRole } from "@sarpbc/types";
import { z } from "zod";
import type { ToolArguments } from "../define-tool";
import { FakeRosterProposals, proposed } from "./roster-proposals.test-utils";
import { rosterTools } from "./roster-tools";

const TEAM_ID = "0b6e3d8a-1f2c-4e5d-8a9b-7c6d5e4f3a2b";
const ALIAS_ID = "1c7f4e9b-2a3d-4f6e-9b0c-8d7e6f5a4b3c";
const SOURCE = "https://www.rlesports.com/news/fixture-rebrand";
const INPUT = { from: "2020-01-01", name: "Fixture Origins", sourceUrl: SOURCE, teamId: TEAM_ID };

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

describe("team alias tools", () => {
  it("add_team_alias queues a proposal sourced by its sourceUrl", async () => {
    vi.stubEnv("ADMIN_URL", "https://admin.sarpbc.test");
    const { call, rosterProposalService } = setup("add_team_alias");

    await call({ ...INPUT, pandascoreId: 1234, to: "2022-06-01" });

    expect(rosterProposalService.changes).toStrictEqual([
      proposed(
        {
          alias: {
            from: "2020-01-01",
            logoUrl: null,
            name: "Fixture Origins",
            pandascoreId: 1234,
            to: "2022-06-01",
          },
          kind: "add_team_alias",
          teamId: TEAM_ID,
        },
        SOURCE,
      ),
    ]);
  });

  it("update_team_alias replaces every field of the named alias", async () => {
    vi.stubEnv("ADMIN_URL", "https://admin.sarpbc.test");
    const { call, rosterProposalService } = setup("update_team_alias");

    await call({ ...INPUT, aliasId: ALIAS_ID });

    expect(rosterProposalService.changes).toStrictEqual([
      proposed(
        {
          alias: {
            from: "2020-01-01",
            logoUrl: null,
            name: "Fixture Origins",
            pandascoreId: null,
            to: null,
          },
          aliasId: ALIAS_ID,
          kind: "update_team_alias",
          teamId: TEAM_ID,
        },
        SOURCE,
      ),
    ]);
  });

  it("requires an official sourceUrl outside Liquipedia and its mirrors", () => {
    const schema = z.object(setup("add_team_alias").tool.inputSchema);
    expect(schema.safeParse(INPUT).success).toBe(true);

    for (const invalid of [
      { sourceUrl: undefined },
      { sourceUrl: "https://liquipedia.net/rocketleague/Fixture" },
      { sourceUrl: "https://www.liquipedia.org/rocketleague/Fixture" },
      { logoUrl: "https://liquipedia.net/commons/images/fixture.png" },
      { logoUrl: "http://cdn.example/fixture.png" },
      { from: "2020-02-30" },
      { name: " " },
    ]) {
      expect(schema.safeParse({ ...INPUT, ...invalid }).success).toBe(false);
    }
  });

  it("requires teams.manage", async () => {
    const { call, rosterProposalService } = setup("add_team_alias", "journalist");
    const result = await call(INPUT);
    expect(result.isError).toBe(true);
    expect(rosterProposalService.changes).toStrictEqual([]);
  });
});
