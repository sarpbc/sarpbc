import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, InvalidInputError } from "../../common/domain/errors";
import { Player, Team } from "../domain/roster";
import type { RosterMergeWriteScope } from "./ports";
import { RosterMergeService } from "./roster-merge.service";

describe("RosterMergeService", () => {
  let players: Map<string, Player>;
  let teams: Map<string, Team>;
  let stores: RosterMergeWriteScope;
  let service: RosterMergeService;
  let shared: string[];

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
    stores = {
      players: {
        findById: async (id) => players.get(id) ?? null,
        findBySlug: vi.fn(),
        save: vi.fn(async () => {}),
        delete: vi.fn(),
      },
      teams: {
        findById: async (id) => teams.get(id) ?? null,
        findBySlug: vi.fn(),
        findWithPlayers: vi.fn(),
        save: vi.fn(async () => {}),
        delete: vi.fn(),
      },
      contracts: {} as RosterMergeWriteScope["contracts"],
      photos: {} as RosterMergeWriteScope["photos"],
      references: {
        movePlayer: vi.fn(async () => {}),
        moveTeam: vi.fn(async () => {}),
        sharedTournamentIds: async () => shared,
      },
    };
    service = new RosterMergeService({ run: (work) => work(stores) });
  });

  it("moves references, fills missing profile fields and keeps the duplicate as a redirect", async () => {
    const { kept, merged } = await service.mergePlayers("zen", "zen-dup");

    expect(stores.references.movePlayer).toHaveBeenCalledWith("zen-dup", "zen");
    expect(kept).toMatchObject({
      nationality: "FR",
      pandascoreId: 42,
      source: "pandascore",
      birthday: new Date("2005-06-21"),
      team: { id: "vitality" },
    });
    expect(merged).toMatchObject({ mergedIntoId: "zen", pandascoreId: null, team: null });
    expect(stores.players.delete).not.toHaveBeenCalled();
    expect(stores.players.save).toHaveBeenCalledWith(merged);
    expect(stores.players.save).toHaveBeenCalledWith(kept);
  });

  it("refuses to merge two distinct PandaScore players", async () => {
    players.get("zen")!.pandascoreId = 1;
    await expect(service.mergePlayers("zen", "zen-dup")).rejects.toThrow(ConflictError);
    expect(stores.references.movePlayer).not.toHaveBeenCalled();
  });

  it("refuses players on different current teams", async () => {
    players.get("zen")!.team = teams.get("kc")!;
    await expect(service.mergePlayers("zen", "zen-dup")).rejects.toThrow(InvalidInputError);
  });

  it("refuses an already merged duplicate or a merged keeper", async () => {
    players.get("zen-dup")!.mergedIntoId = "someone";
    await expect(service.mergePlayers("zen", "zen-dup")).rejects.toThrow(ConflictError);
    await expect(service.mergePlayers("zen-dup", "zen")).rejects.toThrow(InvalidInputError);
    await expect(service.mergePlayers("zen", "zen")).rejects.toThrow(InvalidInputError);
  });

  it("merges teams into an inactive redirect", async () => {
    const { kept, merged } = await service.mergeTeams("kc", "kc-dup");

    expect(stores.references.moveTeam).toHaveBeenCalledWith("kc-dup", "kc");
    expect(kept).toMatchObject({ location: "FR", imageUrl: "kc.png", pandascoreId: 7 });
    expect(merged).toMatchObject({ mergedIntoId: "kc", active: false, pandascoreId: null });
    expect(stores.teams.delete).not.toHaveBeenCalled();
  });

  it("refuses teams that took part in the same tournament", async () => {
    shared = ["rlcs-major"];
    await expect(service.mergeTeams("kc", "kc-dup")).rejects.toThrow("rlcs-major");
    expect(stores.references.moveTeam).not.toHaveBeenCalled();
  });
});
