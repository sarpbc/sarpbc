import type { ToolArguments } from "../define-tool";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { InvalidInputError } from "../../../common/domain/errors/invalid-input-error";
import { jsonOf } from "../../../../test/mcp-result";
import { FakeRosterProposals, proposed } from "./roster-proposals.test-utils";
import { rosterTools } from "./roster-tools";

const TEAM_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";
const PLAYER_ID = "6f1c1f9e-2a4b-4c55-9d1e-0f3a2b1c4d5e";
const LOGO_URL = `https://cdn.sarpbc.test/teams/${TEAM_ID}/logo-light-0123456789abcdef.webp`;

const input = {
  imageUrl: "https://kcorp.gg/brand/logo.svg",
  sourceUrl: "https://kcorp.gg/brand",
  teamId: TEAM_ID,
  variant: "light",
};

const setup = (role: "admin" | "journalist") => {
  vi.stubEnv("ADMIN_URL", "https://admin.sarpbc.test");

  const rosterProposalService = new FakeRosterProposals();

  const tools = rosterTools({ rosterProposalService });

  const tool = (name: string) => {
    const found = tools.find((candidate) => candidate.name === name);

    if (!found) {
      throw new Error(`${name} is not defined`);
    }

    return found;
  };

  const call = async (name: string, args: ToolArguments) =>
    await tool(name).run({ email: "staff@test.com", id: "u1", role }, args);

  return { call, rosterProposalService, tool };
};

const textOf = (result: { content: { type: string; text?: string }[] }) =>
  result.content[0]?.text ?? "";

describe("upload_team_logo", () => {
  it("proposes the logo and returns the stored asset for review", async () => {
    const { rosterProposalService, call } = setup("admin");

    const result = await call("upload_team_logo", input);

    expect(rosterProposalService.logos).toStrictEqual([
      {
        logo: { imageUrl: input.imageUrl, teamId: TEAM_ID, variant: "light" },
        proposedById: "u1",
        sourceUrl: input.sourceUrl,
      },
    ]);
    expect(jsonOf(result)).toMatchObject({
      change: { logoUrl: LOGO_URL, variant: "light" },
      kind: "upload_team_logo",
      proposalId: "proposal-1",
      status: "pending",
    });
  });

  it("validates its input shape and refuses Liquipedia", () => {
    const { tool } = setup("admin");
    const schema = z.object(tool("upload_team_logo").inputSchema);

    expect(schema.safeParse(input).success).toBe(true);

    for (const invalid of [
      { ...input, variant: "color" },
      { ...input, teamId: "kc" },
      { ...input, imageUrl: "http://kcorp.gg/logo.png" },
      { ...input, imageUrl: "https://liquipedia.net/commons/images/kc.png" },
      { ...input, sourceUrl: "https://liquipedia.net/rocketleague/Karmine_Corp" },
      { ...input, sourceUrl: undefined },
    ]) {
      expect(schema.safeParse(invalid).success).toBe(false);
    }
  });

  it("returns validation failures as tool errors", async () => {
    const { rosterProposalService, call } = setup("admin");
    rosterProposalService.failNext(
      new InvalidInputError("The logo is 64x64 pixels; it must be at least 128x128."),
    );

    const result = await call("upload_team_logo", input);

    expect(result).toMatchObject({
      content: [{ text: "The logo is 64x64 pixels; it must be at least 128x128." }],
      isError: true,
    });
  });

  it("requires teams.manage and says so in its description", async () => {
    const { rosterProposalService, call, tool } = setup("journalist");

    const callResult = await call("upload_team_logo", input);
    expect(callResult.isError).toBe(true);
    expect(rosterProposalService.logos).toStrictEqual([]);
    expect(tool("upload_team_logo").description).toContain("Requires teams.manage.");
  });
});

describe("roster proposals", () => {
  it("defaults a removed player to free_agent and a created player to free_agent", async () => {
    const { rosterProposalService, call } = setup("admin");

    const move = {
      effectiveDate: "2026-11-01",
      playerId: PLAYER_ID,
      sourceUrl: input.sourceUrl,
      teamId: TEAM_ID,
    };

    await call("remove_player_from_team", move);
    await call("create_player", { name: "Zen", sourceUrl: input.sourceUrl });

    const expected1: unknown = expect.objectContaining({
      kind: "remove_player_from_team",
      status: "free_agent",
    });

    expect(rosterProposalService.changes).toContainEqual({
      change: expected1,
      proposedById: "u1",
      sourceUrl: input.sourceUrl,
    });

    const expected2: unknown = expect.objectContaining({
      kind: "create_player",
      status: "free_agent",
    });

    expect(rosterProposalService.changes).toContainEqual({
      change: expected2,
      proposedById: "u1",
      sourceUrl: input.sourceUrl,
    });
  });

  it("maps role to contractRole and country to nationality", async () => {
    const { rosterProposalService, call } = setup("admin");

    await call("add_player_to_team", {
      effectiveDate: "2026-11-01",
      playerId: PLAYER_ID,
      role: "coach",
      sourceUrl: input.sourceUrl,
      teamId: TEAM_ID,
    });
    await call("update_player", { country: "FR", playerId: PLAYER_ID, sourceUrl: input.sourceUrl });

    const expected3: unknown = expect.objectContaining({
      contractRole: "coach",
      kind: "add_player_to_team",
    });

    expect(rosterProposalService.changes).toContainEqual({
      change: expected3,
      proposedById: "u1",
      sourceUrl: input.sourceUrl,
    });

    const expected4: unknown = expect.objectContaining({
      kind: "update_player",
      nationality: "FR",
    });

    expect(rosterProposalService.changes).toContainEqual({
      change: expected4,
      proposedById: "u1",
      sourceUrl: input.sourceUrl,
    });
  });

  it("rejects a contract that ends before it starts and an update without fields", async () => {
    const { rosterProposalService, call } = setup("admin");

    const reversed = await call("create_contract", {
      endDate: "2026-01-01",
      playerId: PLAYER_ID,
      sourceUrl: input.sourceUrl,
      startDate: "2026-06-01",
      teamId: TEAM_ID,
    });

    const empty = await call("update_team", { sourceUrl: input.sourceUrl, teamId: TEAM_ID });

    expect(textOf(reversed)).toBe("endDate must not precede startDate.");
    expect(empty.isError).toBe(true);
    expect(rosterProposalService.changes).toStrictEqual([]);
  });

  it("lists pending proposals by default", async () => {
    const { rosterProposalService, call } = setup("admin");

    await call("list_roster_proposals", {});

    expect(rosterProposalService.listings).toStrictEqual(["pending"]);
  });
});

describe("delete proposals", () => {
  const MATCH_ID = "3b241101-e2bb-4255-8caf-4136c566a962";
  const KEPT_TEAM_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";

  it("records a pending match deletion with its reason and optional source", async () => {
    const { rosterProposalService, call } = setup("admin");

    const unsourced = await call("propose_delete_match", {
      matchId: MATCH_ID,
      reason: "Series imported twice",
    });

    await call("propose_delete_match", {
      matchId: MATCH_ID,
      reason: "Series imported twice",
      sourceUrl: input.sourceUrl,
    });

    expect(rosterProposalService.changes[0]).toStrictEqual(
      proposed({ kind: "delete_match", matchId: MATCH_ID, reason: "Series imported twice" }),
    );

    const expected5: unknown = expect.objectContaining({ kind: "delete_match" });

    expect(rosterProposalService.changes[1]).toStrictEqual({
      change: expected5,
      proposedById: "u1",
      sourceUrl: input.sourceUrl,
    });
    const nothingChanged: unknown = expect.stringContaining("Nothing changed yet");

    expect(jsonOf(unsourced)).toMatchObject({
      kind: "delete_match",
      note: nothingChanged,
      proposalId: "proposal-1",
      reviewUrl: "https://admin.sarpbc.test/proposals",
      status: "pending",
    });
  });

  it("records a pending team deletion or merge", async () => {
    const { rosterProposalService, call } = setup("admin");

    await call("propose_delete_team", { reason: "Empty duplicate", teamId: TEAM_ID });
    await call("propose_delete_team", {
      mergeIntoTeamId: KEPT_TEAM_ID,
      reason: "Empty duplicate",
      teamId: TEAM_ID,
    });

    expect(rosterProposalService.changes[0]).toStrictEqual(
      proposed({
        kind: "delete_team",
        mergeIntoTeamId: undefined,
        reason: "Empty duplicate",
        teamId: TEAM_ID,
      }),
    );
    expect(rosterProposalService.changes[1]).toStrictEqual(
      proposed({
        kind: "delete_team",
        mergeIntoTeamId: KEPT_TEAM_ID,
        reason: "Empty duplicate",
        teamId: TEAM_ID,
      }),
    );
  });

  it("requires an id and a reason and refuses Liquipedia", () => {
    const { tool } = setup("admin");
    const match = z.object(tool("propose_delete_match").inputSchema);
    const team = z.object(tool("propose_delete_team").inputSchema);

    expect(match.safeParse({ matchId: MATCH_ID, reason: "Duplicate" }).success).toBe(true);

    for (const invalid of [
      { matchId: "7395", reason: "Duplicate" },
      { matchId: MATCH_ID, reason: "  " },
      { matchId: MATCH_ID },
      {
        matchId: MATCH_ID,
        reason: "Duplicate",
        sourceUrl: "https://liquipedia.net/rocketleague/RLCS",
      },
    ]) {
      expect(match.safeParse(invalid).success).toBe(false);
    }

    expect(team.safeParse({ reason: "Duplicate", teamId: TEAM_ID }).success).toBe(true);
    expect(
      team.safeParse({ mergeIntoTeamId: "kc", reason: "Duplicate", teamId: TEAM_ID }).success,
    ).toBe(false);
  });

  it("returns a refused proposal as a tool error", async () => {
    const { rosterProposalService, call } = setup("admin");
    rosterProposalService.failNext(
      new InvalidInputError("Group A is synced from PandaScore and cannot be deleted"),
    );

    const result = await call("propose_delete_match", { matchId: MATCH_ID, reason: "Duplicate" });

    expect(result).toMatchObject({
      content: [{ text: "Group A is synced from PandaScore and cannot be deleted" }],
      isError: true,
    });
  });

  it("requires the permission that reviews the deletion", async () => {
    const { rosterProposalService, call, tool } = setup("journalist");

    const callResult2 = await call("propose_delete_match", {
      matchId: MATCH_ID,
      reason: "Duplicate",
    });

    expect(callResult2.isError).toBe(true);
    const callResult3 = await call("propose_delete_team", { reason: "Duplicate", teamId: TEAM_ID });
    expect(callResult3.isError).toBe(true);
    expect(rosterProposalService.changes).toStrictEqual([]);
    expect(tool("propose_delete_match").description).toContain("Requires tournaments.manage.");
    expect(tool("propose_delete_team").description).toContain("Requires teams.manage.");
  });
});
