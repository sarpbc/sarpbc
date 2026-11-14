import type { ToolArguments } from "../define-tool";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { InvalidInputError } from "../../../common/domain/errors/invalid-input-error";
import { RosterProposal } from "../../../roster-proposal/domain/roster-proposal";
import { jsonOf } from "../../../../test/mcp-result";
import type { RosterProposalService } from "../../../roster-proposal/application/roster-proposal.service";
import { rosterTools } from "./roster-tools";

const TEAM_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";
const PLAYER_ID = "6f1c1f9e-2a4b-4c55-9d1e-0f3a2b1c4d5e";
const LOGO_URL = `https://cdn.sarpbc.test/teams/${TEAM_ID}/logo-light-0123456789abcdef.webp`;

const input = {
  teamId: TEAM_ID,
  variant: "light",
  imageUrl: "https://kcorp.gg/brand/logo.svg",
  sourceUrl: "https://kcorp.gg/brand",
};

function setup(role: "admin" | "journalist") {
  vi.stubEnv("ADMIN_URL", "https://admin.sarpbc.test");

  const rosterProposalService = {
    propose: vi.fn<RosterProposalService["propose"]>(async (change, sourceUrl) =>
      Object.assign(new RosterProposal(), { id: "proposal-1", sourceUrl, change }),
    ),
    proposeTeamLogo: vi.fn<RosterProposalService["proposeTeamLogo"]>(async (logo, sourceUrl) =>
      Object.assign(new RosterProposal(), {
        id: "proposal-1",
        sourceUrl,
        change: { kind: "upload_team_logo", ...logo, logoUrl: LOGO_URL },
      }),
    ),
    list: vi.fn<RosterProposalService["list"]>(),
  };

  const tools = rosterTools({ rosterProposalService });

  const tool = (name: string) => {
    const found = tools.find((candidate) => candidate.name === name);

    if (!found) {
      throw new Error(`${name} is not defined`);
    }

    return found;
  };

  const call = async (name: string, args: ToolArguments) =>
    await tool(name).run({ id: "u1", email: "staff@test.com", role }, args);

  return { rosterProposalService, tool, call };
}

function textOf(result: { content: { type: string; text?: string }[] }): string {
  return result.content[0]?.text ?? "";
}

describe("upload_team_logo", () => {
  it("proposes the logo and returns the stored asset for review", async () => {
    const { rosterProposalService, call } = setup("admin");

    const result = await call("upload_team_logo", input);

    expect(rosterProposalService.proposeTeamLogo).toHaveBeenCalledWith(
      { teamId: TEAM_ID, variant: "light", imageUrl: input.imageUrl },
      input.sourceUrl,
      "u1",
    );
    expect(jsonOf(result)).toMatchObject({
      proposalId: "proposal-1",
      kind: "upload_team_logo",
      status: "pending",
      change: { variant: "light", logoUrl: LOGO_URL },
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
    rosterProposalService.proposeTeamLogo.mockRejectedValueOnce(
      new InvalidInputError("The logo is 64x64 pixels; it must be at least 128x128."),
    );

    const result = await call("upload_team_logo", input);

    expect(result).toMatchObject({
      isError: true,
      content: [{ text: "The logo is 64x64 pixels; it must be at least 128x128." }],
    });
  });

  it("requires teams.manage and says so in its description", async () => {
    const { rosterProposalService, call, tool } = setup("journalist");

    const callResult = await call("upload_team_logo", input);
    expect(callResult.isError).toBe(true);
    expect(rosterProposalService.proposeTeamLogo).not.toHaveBeenCalled();
    expect(tool("upload_team_logo").description).toContain("Requires teams.manage.");
  });
});

describe("roster proposals", () => {
  it("defaults a removed player to free_agent and a created player to free_agent", async () => {
    const { rosterProposalService, call } = setup("admin");

    const move = {
      playerId: PLAYER_ID,
      teamId: TEAM_ID,
      effectiveDate: "2026-11-01",
      sourceUrl: input.sourceUrl,
    };

    await call("remove_player_from_team", move);
    await call("create_player", { name: "Zen", sourceUrl: input.sourceUrl });

    expect(rosterProposalService.propose).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "remove_player_from_team", status: "free_agent" }),
      input.sourceUrl,
      "u1",
    );
    expect(rosterProposalService.propose).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "create_player", status: "free_agent" }),
      input.sourceUrl,
      "u1",
    );
  });

  it("maps role to contractRole and country to nationality", async () => {
    const { rosterProposalService, call } = setup("admin");

    await call("add_player_to_team", {
      playerId: PLAYER_ID,
      teamId: TEAM_ID,
      effectiveDate: "2026-11-01",
      role: "coach",
      sourceUrl: input.sourceUrl,
    });
    await call("update_player", { playerId: PLAYER_ID, country: "FR", sourceUrl: input.sourceUrl });

    expect(rosterProposalService.propose).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "add_player_to_team", contractRole: "coach" }),
      input.sourceUrl,
      "u1",
    );
    expect(rosterProposalService.propose).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "update_player", nationality: "FR" }),
      input.sourceUrl,
      "u1",
    );
  });

  it("rejects a contract that ends before it starts and an update without fields", async () => {
    const { rosterProposalService, call } = setup("admin");

    const reversed = await call("create_contract", {
      playerId: PLAYER_ID,
      teamId: TEAM_ID,
      startDate: "2026-06-01",
      endDate: "2026-01-01",
      sourceUrl: input.sourceUrl,
    });

    const empty = await call("update_team", { teamId: TEAM_ID, sourceUrl: input.sourceUrl });

    expect(textOf(reversed)).toBe("endDate must not precede startDate.");
    expect(empty.isError).toBe(true);
    expect(rosterProposalService.propose).not.toHaveBeenCalled();
  });

  it("lists pending proposals by default", async () => {
    const { rosterProposalService, call } = setup("admin");
    rosterProposalService.list.mockResolvedValue({ proposals: [], names: {} });

    await call("list_roster_proposals", {});

    expect(rosterProposalService.list).toHaveBeenCalledWith("pending");
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

    expect(rosterProposalService.propose).toHaveBeenNthCalledWith(
      1,
      { kind: "delete_match", matchId: MATCH_ID, reason: "Series imported twice" },
      "",
      "u1",
    );
    expect(rosterProposalService.propose).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ kind: "delete_match" }),
      input.sourceUrl,
      "u1",
    );
    const nothingChanged: unknown = expect.stringContaining("Nothing changed yet");

    expect(jsonOf(unsourced)).toMatchObject({
      proposalId: "proposal-1",
      kind: "delete_match",
      status: "pending",
      reviewUrl: "https://admin.sarpbc.test/proposals",
      note: nothingChanged,
    });
  });

  it("records a pending team deletion or merge", async () => {
    const { rosterProposalService, call } = setup("admin");

    await call("propose_delete_team", { teamId: TEAM_ID, reason: "Empty duplicate" });
    await call("propose_delete_team", {
      teamId: TEAM_ID,
      reason: "Empty duplicate",
      mergeIntoTeamId: KEPT_TEAM_ID,
    });

    expect(rosterProposalService.propose).toHaveBeenNthCalledWith(
      1,
      { kind: "delete_team", teamId: TEAM_ID, reason: "Empty duplicate" },
      "",
      "u1",
    );
    expect(rosterProposalService.propose).toHaveBeenNthCalledWith(
      2,
      {
        kind: "delete_team",
        teamId: TEAM_ID,
        reason: "Empty duplicate",
        mergeIntoTeamId: KEPT_TEAM_ID,
      },
      "",
      "u1",
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

    expect(team.safeParse({ teamId: TEAM_ID, reason: "Duplicate" }).success).toBe(true);
    expect(
      team.safeParse({ teamId: TEAM_ID, reason: "Duplicate", mergeIntoTeamId: "kc" }).success,
    ).toBe(false);
  });

  it("returns a refused proposal as a tool error", async () => {
    const { rosterProposalService, call } = setup("admin");
    rosterProposalService.propose.mockRejectedValueOnce(
      new InvalidInputError("Group A is synced from PandaScore and cannot be deleted"),
    );

    const result = await call("propose_delete_match", { matchId: MATCH_ID, reason: "Duplicate" });

    expect(result).toMatchObject({
      isError: true,
      content: [{ text: "Group A is synced from PandaScore and cannot be deleted" }],
    });
  });

  it("requires the permission that reviews the deletion", async () => {
    const { rosterProposalService, call, tool } = setup("journalist");

    const callResult2 = await call("propose_delete_match", {
      matchId: MATCH_ID,
      reason: "Duplicate",
    });

    expect(callResult2.isError).toBe(true);
    const callResult3 = await call("propose_delete_team", { teamId: TEAM_ID, reason: "Duplicate" });
    expect(callResult3.isError).toBe(true);
    expect(rosterProposalService.propose).not.toHaveBeenCalled();
    expect(tool("propose_delete_match").description).toContain("Requires tournaments.manage.");
    expect(tool("propose_delete_team").description).toContain("Requires teams.manage.");
  });
});
