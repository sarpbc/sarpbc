import { beforeEach, describe, expect, it } from "vitest";
import { setupRosterProposalService as setup } from "../../../test/roster-proposal-service.setup";

describe("RosterProposalService season award proposals", () => {
  const announcement = "https://x.com/RLEsports/status/1";
  let fixture: ReturnType<typeof setup>;

  beforeEach(() => {
    fixture = setup();
  });

  const proposeRegional = async (seasonId = "season-1") =>
    await fixture.service.propose(
      {
        awardType: "regional_mvp",
        kind: "award_season_player",
        playerId: "zen",
        region: "Europe",
        seasonId,
      },
      announcement,
      "journalist",
    );

  it("keeps the award pending without recording it", async () => {
    const proposal = await proposeRegional();

    expect(proposal).toMatchObject({ sourceUrl: announcement, status: "pending" });
    expect(fixture.seasons.addAward).not.toHaveBeenCalled();
  });

  it("refuses an unknown season before recording anything", async () => {
    await expect(proposeRegional("missing")).rejects.toThrow("Season not found");
    expect(fixture.saved.size).toBe(0);
  });

  it("records the award with the announcement as its source on approval", async () => {
    const { id } = await proposeRegional();

    await expect(fixture.service.approve(id, "admin")).resolves.toMatchObject({
      entityId: "season-award-1",
    });
    expect(fixture.seasons.addAward).toHaveBeenCalledWith("season-1", {
      awardType: "regional_mvp",
      playerId: "zen",
      region: "Europe",
      sourceUrl: announcement,
    });
    expect(fixture.staff.permissions).toContain("tournaments.manage");
  });

  it("names the season in the pending list", async () => {
    await proposeRegional();

    await fixture.service.list("pending");

    expect(fixture.store.names).toHaveBeenCalledWith(
      expect.objectContaining({ players: ["zen"], seasons: ["season-1"] }),
    );
  });
});
