import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { UnprocessableError } from "../../common/domain/errors/unprocessable-error";
import { Contract } from "../domain/contract";
import { Player } from "../domain/player";
import { PlayerPhoto } from "../domain/player-photo";
import { Team } from "../domain/team";
import { PlayerService } from "./player.service";
import type { RosterWriteScope } from "./ports";
import { unusedPhotoQueries, unusedPlayerQueries } from "../../../test/roster-doubles";

describe("PlayerService profile photos", () => {
  const player = Object.assign(new Player(), { id: "player", imageUrl: "old.png" });
  let gallery: PlayerPhoto[];
  let service: PlayerService;
  let transactions: number;

  const scope: RosterWriteScope = {
    contracts: {
      delete: async () => {},
      findById: async () => null,
      findByPlayer: async () => [],
      findByTeam: async () => [],
      save: async () => {},
    },
    photos: {
      delete: async (photo) => {
        gallery = gallery.filter((existing) => existing !== photo);
      },
      findById: async (id) => gallery.find((photo) => photo.id === id) ?? null,
      findByPlayer: async () => gallery,
      save: async (photo) => {
        gallery.push(photo);
      },
    },
    players: {
      delete: async () => {},
      findById: async (id) => (id === player.id ? player : null),
      findBySlug: async () => null,
      save: async () => {},
    },
    teams: {
      delete: async () => {},
      findById: async () => null,
      findBySlug: async () => null,
      redirectCount: async () => 0,
      save: async () => {},
    },
  };

  beforeEach(() => {
    player.imageUrl = "old.png";
    gallery = [Object.assign(new PlayerPhoto(), { id: "selected", player, url: "selected.png" })];
    transactions = 0;
    service = new PlayerService(unusedPlayerQueries, unusedPhotoQueries, {
      run: async (work) => {
        transactions += 1;

        return await work(scope);
      },
    });
  });

  it("archives the previous profile and consumes the selected gallery photo in one transaction", async () => {
    const setProfilePhotoResult = await service.setProfilePhoto(player.id, "selected");
    expect(setProfilePhotoResult.imageUrl).toBe("selected.png");
    expect(gallery.map((photo) => photo.url)).toStrictEqual(["old.png"]);
    expect(transactions).toBe(1);
  });

  it("archives a replaced profile when editing player details", async () => {
    await service.update(player.id, { imageUrl: "new.png" });
    expect(player.imageUrl).toBe("new.png");
    expect(gallery.map((photo) => photo.url)).toStrictEqual(["selected.png", "old.png"]);
    expect(transactions).toBe(1);
  });

  it("rejects a gallery photo belonging to another player", async () => {
    gallery[0].player = Object.assign(new Player(), { id: "someone-else" });
    await expect(service.setProfilePhoto(player.id, "selected")).rejects.toThrow("not found");
    expect(player.imageUrl).toBe("old.png");
    expect(gallery.map((photo) => photo.url)).toStrictEqual(["selected.png"]);
  });

  it("rejects an unknown team on create and update like the contract writes do", async () => {
    await expect(service.create({ name: "Zen", teamId: "missing" })).rejects.toBeInstanceOf(
      UnprocessableError,
    );
    await expect(service.update(player.id, { teamId: "missing" })).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  });
});

describe("PlayerService roster moves", () => {
  const source = "https://x.com/team/status/1";
  let oldTeam: Team;
  let newTeam: Team;
  let player: Player;
  let history: Contract[];
  let stores: RosterWriteScope;
  let saveContract: Mock<RosterWriteScope["contracts"]["save"]>;
  let deleteContract: Mock<RosterWriteScope["contracts"]["delete"]>;
  let savePlayer: Mock<RosterWriteScope["players"]["save"]>;
  let service: PlayerService;

  beforeEach(() => {
    oldTeam = Object.assign(new Team(), { id: "old", name: "Old" });
    newTeam = Object.assign(new Team(), { id: "new", name: "New" });
    player = Object.assign(new Player(), { id: "player", name: "Zen", team: oldTeam });
    history = [
      Object.assign(new Contract(), {
        endDate: new Date("2025-01-01"),
        id: "past",
        player,
        startDate: new Date("2024-01-01"),
        team: newTeam,
      }),
      Object.assign(new Contract(), {
        id: "open",
        player,
        startDate: new Date("2025-02-01"),
        team: oldTeam,
      }),
    ];
    const teams = new Map([oldTeam, newTeam].map((team) => [team.id, team]));
    saveContract = vi.fn<RosterWriteScope["contracts"]["save"]>();
    deleteContract = vi.fn<RosterWriteScope["contracts"]["delete"]>();
    savePlayer = vi.fn<RosterWriteScope["players"]["save"]>();
    stores = {
      contracts: {
        delete: deleteContract,
        findById: vi.fn<RosterWriteScope["contracts"]["findById"]>(),
        findByPlayer: async () => history,
        findByTeam: vi.fn<RosterWriteScope["contracts"]["findByTeam"]>(),
        save: saveContract,
      },
      photos: {
        delete: vi.fn<RosterWriteScope["photos"]["delete"]>(),
        findById: vi.fn<RosterWriteScope["photos"]["findById"]>(),
        findByPlayer: vi.fn<RosterWriteScope["photos"]["findByPlayer"]>(),
        save: vi.fn<RosterWriteScope["photos"]["save"]>(),
      },
      players: {
        delete: vi.fn<RosterWriteScope["players"]["delete"]>(),
        findById: async (id) => (id === player.id ? player : null),
        findBySlug: vi.fn<RosterWriteScope["players"]["findBySlug"]>(),
        save: savePlayer,
      },
      teams: {
        delete: vi.fn<RosterWriteScope["teams"]["delete"]>(),
        findById: async (id) => teams.get(id) ?? null,
        findBySlug: vi.fn<RosterWriteScope["teams"]["findBySlug"]>(),
        redirectCount: vi.fn<RosterWriteScope["teams"]["redirectCount"]>(),
        save: vi.fn<RosterWriteScope["teams"]["save"]>(),
      },
    };
    service = new PlayerService(unusedPlayerQueries, unusedPhotoQueries, {
      run: async (work) => await work(stores),
    });
  });

  const lastSavedContract = () => saveContract.mock.lastCall?.[0];
  const move = (teamId: string) => ({ effectiveDate: "2026-10-23", sourceUrl: source, teamId });

  it("closes the open contract and opens a sourced one when a player joins a team", async () => {
    await service.joinTeam(player.id, move(newTeam.id));
    expect(history[1]).toMatchObject({ endDate: new Date("2026-10-23"), leaveSourceUrl: source });
    expect(history[0].endDate).toStrictEqual(new Date("2025-01-01"));
    expect(lastSavedContract()).toMatchObject({
      endDate: null,
      joinSourceUrl: source,
      startDate: new Date("2026-10-23"),
      team: newTeam,
    });
  });

  it("moves the player to the new team without deleting any contract", async () => {
    await service.joinTeam(player.id, move(newTeam.id));
    expect(player).toMatchObject({ status: "active", team: newTeam });
    expect(saveContract).toHaveBeenCalledTimes(2);
    expect(deleteContract).not.toHaveBeenCalled();
  });

  it("rejects joining a team the player is already on", async () => {
    await expect(service.joinTeam(player.id, move(oldTeam.id))).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(saveContract).not.toHaveBeenCalled();
  });

  it("opens a staff contract on the current team and keeps the player contract", async () => {
    await service.joinTeam(player.id, {
      ...move(oldTeam.id),
      role: "coach",
    });
    expect(history[1]).toMatchObject({
      endDate: new Date("2026-10-23"),
      role: "active",
      startDate: new Date("2025-02-01"),
    });
    expect(lastSavedContract()).toMatchObject({
      endDate: null,
      role: "coach",
      startDate: new Date("2026-10-23"),
      team: oldTeam,
    });
  });

  it("rejects a staff move into the role the player already holds", async () => {
    history[1].role = "coach";
    await expect(
      service.joinTeam(player.id, { ...move(oldTeam.id), role: "coach" }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(saveContract).not.toHaveBeenCalled();
  });

  it("names the conflict without exposing the raw role value", async () => {
    history[1].role = "assistant_coach";
    await expect(
      service.joinTeam(player.id, { ...move(oldTeam.id), role: "assistant_coach" }),
    ).rejects.toThrow("Zen already has an open contract with Old in this role");
  });

  it("moves a player to the bench of the same team with a new contract", async () => {
    await service.joinTeam(player.id, {
      ...move(oldTeam.id),
      role: "benched",
    });
    expect(history[1]).toMatchObject({
      endDate: new Date("2026-10-23"),
      role: "active",
    });
    expect(lastSavedContract()).toMatchObject({
      endDate: null,
      role: "benched",
      team: oldTeam,
    });
  });

  it("rejects joining an inactive team", async () => {
    newTeam.active = false;
    await expect(service.joinTeam(player.id, move(newTeam.id))).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    expect(history[1].endDate).toBeNull();
  });

  it("closes the contract and records the status when a player leaves", async () => {
    await service.leaveTeam(player.id, {
      ...move(oldTeam.id),
      status: "retired",
    });
    expect(history[1].leaveSourceUrl).toBe(source);
    expect(player).toMatchObject({ status: "retired", team: null });
    expect(deleteContract).not.toHaveBeenCalled();
  });

  it("clears an imported current team that has no contract", async () => {
    history = [];
    await service.leaveTeam(player.id, {
      ...move(oldTeam.id),
      status: "free_agent",
    });
    expect(player).toMatchObject({ status: "free_agent", team: null });
  });

  it("keeps the current team status when closing a stale contract elsewhere", async () => {
    history.push(
      Object.assign(new Contract(), {
        id: "stale",
        player,
        startDate: new Date("2025-03-01"),
        team: newTeam,
      }),
    );
    await service.leaveTeam(player.id, {
      ...move(newTeam.id),
      status: "retired",
    });
    expect(history[2].endDate).toStrictEqual(new Date("2026-10-23"));
    expect(player).toMatchObject({ status: "active", team: oldTeam });
  });

  it("rejects leaving a team the player is not on", async () => {
    await expect(
      service.leaveTeam(player.id, { ...move(newTeam.id), status: "free_agent" }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(player.team).toBe(oldTeam);
    expect(savePlayer).not.toHaveBeenCalled();
  });
});
