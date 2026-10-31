import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { InvalidInputError } from "../../../common/domain/errors";
import { RosterProposal } from "../../../roster-proposal/domain/roster-proposal";
import { registerRosterTools } from "./roster-tools";

const TEAM_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";
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
    proposeTeamLogo: vi.fn(async (logo: { teamId: string; variant: "light" }, sourceUrl: string) =>
      Object.assign(new RosterProposal(), {
        id: "proposal-1",
        sourceUrl,
        change: { kind: "upload_team_logo", ...logo, logoUrl: LOGO_URL },
      }),
    ),
  };
  const registerTool = vi.fn();
  registerRosterTools(
    { registerTool } as never,
    { user: { id: "u1", email: "staff@test.com", role }, rosterProposalService } as never,
  );
  const tool = registerTool.mock.calls.find((call) => call[0] === "upload_team_logo");
  if (!tool) throw new Error("upload_team_logo is not registered");
  return { rosterProposalService, tool };
}

describe("upload_team_logo", () => {
  it("proposes the logo and returns the stored asset for review", async () => {
    const { rosterProposalService, tool } = setup("admin");

    const result = await tool[2](input);

    expect(rosterProposalService.proposeTeamLogo).toHaveBeenCalledWith(
      { teamId: TEAM_ID, variant: "light", imageUrl: input.imageUrl },
      input.sourceUrl,
      "u1",
    );
    expect(JSON.parse(result.content[0].text)).toMatchObject({
      proposalId: "proposal-1",
      kind: "upload_team_logo",
      status: "pending",
      change: { variant: "light", logoUrl: LOGO_URL },
    });
  });

  it("validates its input shape and refuses Liquipedia", () => {
    const { tool } = setup("admin");
    const schema = z.object(tool[1].inputSchema);

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
    const { rosterProposalService, tool } = setup("admin");
    rosterProposalService.proposeTeamLogo.mockRejectedValueOnce(
      new InvalidInputError("The logo is 64x64 pixels; it must be at least 128x128."),
    );

    const result = await tool[2](input);

    expect(result).toMatchObject({
      isError: true,
      content: [{ text: "The logo is 64x64 pixels; it must be at least 128x128." }],
    });
  });

  it("requires teams.manage", async () => {
    const { rosterProposalService, tool } = setup("journalist");

    expect((await tool[2](input)).isError).toBe(true);
    expect(rosterProposalService.proposeTeamLogo).not.toHaveBeenCalled();
  });
});
