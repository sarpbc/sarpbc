import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { Player } from "../domain/player";
import { Team } from "../domain/team";
import type { RosterMergeWriteScope } from "./ports";
import { present } from "../../../test/doubles";
import { unusedContractWriter, unusedPhotoWriter } from "../../../test/roster-doubles";
import { RosterMergeService } from "./roster-merge.service";

describe("RosterMergeService", () => {
  let players: Map<string, Player>;
  let teams: Map<string, Team>;
  let stores: RosterMergeWriteScope;
  let service: RosterMergeService;
  let shared: string[];
  let savePlayer: Mock<RosterMergeWriteScope["players"]["save"]>;
  let deletePlayer: Mock<RosterMergeWriteScope["players"]["delete"]>;
  let saveTeam: Mock<RosterMergeWriteScope["teams"]["save"]>;
  let deleteTeam: Mock<RosterMergeWriteScope["teams"]["delete"]>;
  let movePlayer: Mock<RosterMergeWriteScope["references"]["movePlayer"]>;
  let moveTeam: Mock<RosterMergeWriteScope["references"]["moveTeam"]>;

  beforeEach(() => {
    const vitality = Object.assign(new Team(), { id: "vitality", name: "Vitality" });
    players = new Map(
      [
        Object.assign(new Player(), { id: "zen", name: "zen", nationality: "FR" }),
        Object.assign(new Player(), {
          id: "zen-dup",
          name: "Zen",
          pandascoreId: 42,
          source: "pandascore" as const,
          birthday: new Date("2005-06-21"),
          team: vitality,
        }),
      ].map((player) => [player.id, player]),
    );
    teams = new Map(
      [
        Object.assign(new Team(), { id: "kc", name: "Karmine Corp", location: "FR" }),
        Object.assign(new Team(), {
          id: "kc-dup",
          name: "KCorp",
          imageUrl: "kc.png",
          pandascoreId: 7,
          source: "pandascore" as const,
        }),
      ].map((team) => [team.id, team]),
    );
    shared = [];
    savePlayer = vi.fn(async () => {});
    deletePlayer = vi.fn<RosterMergeWriteScope["players"]["delete"]>();
    saveTeam = vi.fn(async () => {});
    deleteTeam = vi.fn<RosterMergeWriteScope["teams"]["delete"]>();
    movePlayer = vi.fn(async () => {});
    moveTeam = vi.fn(async () => {});
    stores = {
      players: {
        findById: async (id) => players.get(id) ?? null,
        findBySlug: async () => null,
        save: savePlayer,
        delete: deletePlayer,
      },
      teams: {
        findById: async (id) => teams.get(id) ?? null,
        findBySlug: async () => null,
        redirectCount: async () => 0,
        save: saveTeam,
        delete: deleteTeam,
      },
      contracts: unusedContractWriter,
      photos: unusedPhotoWriter,
      references: {
        movePlayer,
        moveTeam,
        sharedTournamentIds: async () => shared,
      },
    };
    service = new RosterMergeService({ run: async (work) => await work(stores) });
  });

  it("moves references, fills missing profile fields and keeps the duplicate as a redirect", async () => {
    const { kept, merged } = await service.mergePlayers("zen", "zen-dup");

    expect(movePlayer).toHaveBeenCalledWith("zen-dup", "zen");
    expect(kept).toMatchObject({
      nationality: "FR",
      pandascoreId: 42,
      source: "pandascore",
      birthday: new Date("2005-06-21"),
      team: { id: "vitality" },
    });
    expect(merged).toMatchObject({ mergedIntoId: "zen", pandascoreId: null, team: null });
    expect(deletePlayer).not.toHaveBeenCalled();
    expect(savePlayer).toHaveBeenCalledWith(merged);
    expect(savePlayer).toHaveBeenCalledWith(kept);
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

    expect(moveTeam).toHaveBeenCalledWith("kc-dup", "kc");
    expect(kept).toMatchObject({ location: "FR", imageUrl: "kc.png", pandascoreId: 7 });
    expect(merged).toMatchObject({ mergedIntoId: "kc", active: false, pandascoreId: null });
    expect(deleteTeam).not.toHaveBeenCalled();
  });

  it("refuses teams that took part in the same tournament", async () => {
    shared = ["rlcs-major"];
    await expect(service.mergeTeams("kc", "kc-dup")).rejects.toThrow("rlcs-major");
    expect(moveTeam).not.toHaveBeenCalled();
  });
});
