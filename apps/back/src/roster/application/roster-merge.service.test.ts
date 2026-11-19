import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { Player } from "../domain/player";
import { Team } from "../domain/team";
import type { RosterMergeWriteScope } from "./ports";
import { present } from "../../../test/doubles";
import { unusedContractWriter, unusedPhotoWriter } from "../../../test/roster-doubles";
import { RosterMergeService } from "./roster-merge.service";

describe(RosterMergeService, () => {
  let players: Map<string, Player>;
  let teams: Map<string, Team>;
  let stores: RosterMergeWriteScope;
  let service: RosterMergeService;
  let shared: string[];
  let savePlayer: MockInstance<RosterMergeWriteScope["players"]["save"]>;
  let deletePlayer: MockInstance<RosterMergeWriteScope["players"]["delete"]>;
  let deleteTeam: MockInstance<RosterMergeWriteScope["teams"]["delete"]>;
  let movePlayer: MockInstance<RosterMergeWriteScope["references"]["movePlayer"]>;
  let moveTeam: MockInstance<RosterMergeWriteScope["references"]["moveTeam"]>;

  beforeEach(() => {
    const vitality = Object.assign(new Team(), { id: "vitality", name: "Vitality" });
    players = new Map(
      [
        Object.assign(new Player(), { id: "zen", name: "zen", nationality: "FR" }),
        Object.assign(new Player(), {
          birthday: new Date("2005-06-21"),
          id: "zen-dup",
          name: "Zen",
          pandascoreId: 42,
          source: "pandascore" as const,
          team: vitality,
        }),
      ].map((player) => [player.id, player]),
    );
    teams = new Map(
      [
        Object.assign(new Team(), { id: "kc", location: "FR", name: "Karmine Corp" }),
        Object.assign(new Team(), {
          id: "kc-dup",
          imageUrl: "kc.png",
          name: "KCorp",
          pandascoreId: 7,
          source: "pandascore" as const,
        }),
      ].map((team) => [team.id, team]),
    );
    shared = [];
    stores = {
      contracts: unusedContractWriter,
      photos: unusedPhotoWriter,
      players: {
        delete: async () => {},
        findById: async (id) => players.get(id) ?? null,
        findBySlug: async () => null,
        save: async () => {},
      },
      references: {
        movePlayer: async () => {},
        moveTeam: async () => {},
        sharedTournamentIds: async () => shared,
      },
      teams: {
        delete: async () => {},
        findById: async (id) => teams.get(id) ?? null,
        findBySlug: async () => null,
        redirectCount: async () => 0,
        save: async () => {},
      },
    };
    savePlayer = vi.spyOn(stores.players, "save");
    deletePlayer = vi.spyOn(stores.players, "delete");
    deleteTeam = vi.spyOn(stores.teams, "delete");
    movePlayer = vi.spyOn(stores.references, "movePlayer");
    moveTeam = vi.spyOn(stores.references, "moveTeam");
    service = new RosterMergeService({ run: async (work) => await work(stores) });
  });

  describe("merging a duplicate player", () => {
    let result: Awaited<ReturnType<RosterMergeService["mergePlayers"]>>;

    beforeEach(async () => {
      result = await service.mergePlayers("zen", "zen-dup");
    });

    it("moves the duplicate's references to the kept player", () => {
      expect(movePlayer).toHaveBeenCalledExactlyOnceWith("zen-dup", "zen");
    });

    it("fills the missing profile fields of the kept player", () => {
      expect(result.kept).toMatchObject({
        birthday: new Date("2005-06-21"),
        nationality: "FR",
        pandascoreId: 42,
        source: "pandascore",
        team: { id: "vitality" },
      });
    });

    it("keeps the duplicate as a redirect instead of deleting it", () => {
      expect(result.merged).toMatchObject({ mergedIntoId: "zen", pandascoreId: null, team: null });
      expect(deletePlayer).not.toHaveBeenCalled();
    });

    it("saves both players", () => {
      expect(savePlayer).toHaveBeenCalledWith(result.merged);
      expect(savePlayer).toHaveBeenCalledWith(result.kept);
    });
  });

  it("refuses to merge two distinct PandaScore players", async () => {
    present(players.get("zen")).pandascoreId = 1;
    await expect(service.mergePlayers("zen", "zen-dup")).rejects.toThrow(ConflictError);
    expect(movePlayer).not.toHaveBeenCalled();
  });

  it("refuses players on different current teams", async () => {
    present(players.get("zen")).team = present(teams.get("kc"));
    await expect(service.mergePlayers("zen", "zen-dup")).rejects.toThrow(InvalidInputError);
  });

  it("refuses an already merged duplicate or a merged keeper", async () => {
    present(players.get("zen-dup")).mergedIntoId = "someone";
    await expect(service.mergePlayers("zen", "zen-dup")).rejects.toThrow(ConflictError);
    await expect(service.mergePlayers("zen-dup", "zen")).rejects.toThrow(InvalidInputError);
    await expect(service.mergePlayers("zen", "zen")).rejects.toThrow(InvalidInputError);
  });

  it("merges teams into an inactive redirect", async () => {
    const { kept, merged } = await service.mergeTeams("kc", "kc-dup");

    expect(moveTeam).toHaveBeenCalledExactlyOnceWith("kc-dup", "kc");
    expect(kept).toMatchObject({ imageUrl: "kc.png", location: "FR", pandascoreId: 7 });
    expect(merged).toMatchObject({ active: false, mergedIntoId: "kc", pandascoreId: null });
    expect(deleteTeam).not.toHaveBeenCalled();
  });

  it("refuses teams that took part in the same tournament", async () => {
    shared = ["rlcs-major"];
    await expect(service.mergeTeams("kc", "kc-dup")).rejects.toThrow("rlcs-major");
    expect(moveTeam).not.toHaveBeenCalled();
  });
});
