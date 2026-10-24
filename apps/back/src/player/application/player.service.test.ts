import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, InvalidInputError } from "../../common/domain/errors";
import { Contract, Player, PlayerPhoto, PlayerStatus, Team } from "../domain/roster";
import { PlayerService } from "./player.service";
import type { RosterStores } from "./ports/roster-transaction";

describe("PlayerService profile photos", () => {
  const player = Object.assign(new Player(), { id: "player", imageUrl: "old.png" });
  let gallery: PlayerPhoto[];
  let service: PlayerService;
  let transactions: number;
  const stores: RosterStores = {
    players: {
      search: async () => [],
      searchAndCount: async () => [[], 0],
      findById: async (id) => (id === player.id ? player : null),
      findBySlug: async () => null,
      getRandomPlayer: async () => null,
      save: async () => {},
      delete: async () => {},
    },
    photos: {
      findByPlayer: async () => gallery,
      findById: async (id) => gallery.find((photo) => photo.id === id) ?? null,
      save: async (photo) => {
        gallery.push(photo);
      },
      delete: async (photo) => {
        gallery = gallery.filter((existing) => existing !== photo);
      },
    },
    contracts: {
      findByPlayer: async () => [],
      findPastContractsByPlayer: async () => [],
      findByTeam: async () => [],
      findFormerPlayersByTeam: async () => [],
      findById: async () => null,
      findActiveContract: async () => null,
      save: async () => {},
      delete: async () => {},
    },
    teams: {
      search: async () => [],
      searchAndCount: async () => [[], 0],
      findById: async () => null,
      findBySlug: async () => null,
      findWithPlayers: async () => null,
      findAllTeams: async () => [],
      save: async () => {},
      delete: async () => {},
    },
  };
  beforeEach(() => {
    player.imageUrl = "old.png";
    gallery = [Object.assign(new PlayerPhoto(), { id: "selected", player, url: "selected.png" })];
    transactions = 0;
    service = new PlayerService(stores.players, stores.photos, stores.teams, {
      run: async (work) => {
        transactions += 1;
        return work(stores);
      },
    });
  });

  it("archives the previous profile and consumes the selected gallery photo in one transaction", async () => {
    expect((await service.setProfilePhoto(player.id, "selected")).imageUrl).toBe("selected.png");
    expect(gallery.map((photo) => photo.url)).toEqual(["old.png"]);
    expect(transactions).toBe(1);
  });

  it("archives a replaced profile when editing player details", async () => {
    await service.update(player.id, { imageUrl: "new.png" });
    expect(player.imageUrl).toBe("new.png");
    expect(gallery.map((photo) => photo.url)).toEqual(["selected.png", "old.png"]);
    expect(transactions).toBe(1);
  });

  it("rejects a gallery photo belonging to another player", async () => {
    gallery[0].player = Object.assign(new Player(), { id: "someone-else" });
    await expect(service.setProfilePhoto(player.id, "selected")).rejects.toThrow("not found");
    expect(player.imageUrl).toBe("old.png");
    expect(gallery.map((photo) => photo.url)).toEqual(["selected.png"]);
  });
});

describe("PlayerService roster moves", () => {
  const source = "https://x.com/team/status/1";
  let oldTeam: Team;
  let newTeam: Team;
  let player: Player;
  let history: Contract[];
  let stores: RosterStores;
  let service: PlayerService;

  beforeEach(() => {
    oldTeam = Object.assign(new Team(), { id: "old", name: "Old" });
    newTeam = Object.assign(new Team(), { id: "new", name: "New" });
    player = Object.assign(new Player(), { id: "player", name: "Zen", team: oldTeam });
    history = [
      Object.assign(new Contract(), {
        id: "past",
        player,
        team: newTeam,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2025-01-01"),
      }),
      Object.assign(new Contract(), {
        id: "open",
        player,
        team: oldTeam,
        startDate: new Date("2025-02-01"),
      }),
    ];
    const teams = new Map([oldTeam, newTeam].map((team) => [team.id, team]));
    stores = {
      players: {
        search: vi.fn(),
        searchAndCount: vi.fn(),
        findById: async (id) => (id === player.id ? player : null),
        findBySlug: vi.fn(),
        getRandomPlayer: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
      },
      photos: { findByPlayer: vi.fn(), findById: vi.fn(), save: vi.fn(), delete: vi.fn() },
      contracts: {
        findByPlayer: async () => history,
        findPastContractsByPlayer: vi.fn(),
        findByTeam: vi.fn(),
        findFormerPlayersByTeam: vi.fn(),
        findById: vi.fn(),
        findActiveContract: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
      },
      teams: {
        search: vi.fn(),
        searchAndCount: vi.fn(),
        findById: async (id) => teams.get(id) ?? null,
        findBySlug: vi.fn(),
        findWithPlayers: vi.fn(),
        findAllTeams: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
      },
    };
    service = new PlayerService(stores.players, stores.photos, stores.teams, {
      run: async (work) => work(stores),
    });
  });

  const move = (teamId: string) => ({ teamId, effectiveDate: "2026-10-23", sourceUrl: source });

  it("closes the open contract and opens a sourced one when a player joins a team", async () => {
    const result = await service.joinTeam(player.id, move(newTeam.id));
    expect(result.closed.map((contract) => contract.id)).toEqual(["open"]);
    expect(history[1]).toMatchObject({ endDate: new Date("2026-10-23"), leaveSourceUrl: source });
    expect(history[0].endDate).toEqual(new Date("2025-01-01"));
    expect(result.opened).toMatchObject({
      team: newTeam,
      startDate: new Date("2026-10-23"),
      endDate: null,
      joinSourceUrl: source,
    });
    expect(player).toMatchObject({ team: newTeam, status: PlayerStatus.ACTIVE });
    expect(stores.contracts.save).toHaveBeenCalledTimes(2);
    expect(stores.contracts.delete).not.toHaveBeenCalled();
  });

  it("rejects joining a team the player is already on", async () => {
    await expect(service.joinTeam(player.id, move(oldTeam.id))).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(stores.contracts.save).not.toHaveBeenCalled();
  });

  it("rejects joining an inactive team", async () => {
    newTeam.active = false;
    await expect(service.joinTeam(player.id, move(newTeam.id))).rejects.toBeInstanceOf(
      InvalidInputError,
    );
    expect(history[1].endDate).toBeNull();
  });

  it("closes the contract and records the status when a player leaves", async () => {
    const result = await service.leaveTeam(player.id, {
      ...move(oldTeam.id),
      status: PlayerStatus.RETIRED,
    });
    expect(result.closed.map((contract) => contract.id)).toEqual(["open"]);
    expect(history[1].leaveSourceUrl).toBe(source);
    expect(player).toMatchObject({ team: null, status: PlayerStatus.RETIRED });
    expect(stores.contracts.delete).not.toHaveBeenCalled();
  });

  it("clears an imported current team that has no contract", async () => {
    history = [];
    const result = await service.leaveTeam(player.id, {
      ...move(oldTeam.id),
      status: PlayerStatus.FREE_AGENT,
    });
    expect(result.closed).toEqual([]);
    expect(player).toMatchObject({ team: null, status: PlayerStatus.FREE_AGENT });
  });

  it("keeps the current team status when closing a stale contract elsewhere", async () => {
    history.push(
      Object.assign(new Contract(), {
        id: "stale",
        player,
        team: newTeam,
        startDate: new Date("2025-03-01"),
      }),
    );
    const result = await service.leaveTeam(player.id, {
      ...move(newTeam.id),
      status: PlayerStatus.RETIRED,
    });
    expect(result.closed.map((contract) => contract.id)).toEqual(["stale"]);
    expect(player).toMatchObject({ team: oldTeam, status: PlayerStatus.ACTIVE });
  });

  it("rejects leaving a team the player is not on", async () => {
    await expect(
      service.leaveTeam(player.id, { ...move(newTeam.id), status: PlayerStatus.FREE_AGENT }),
    ).rejects.toBeInstanceOf(InvalidInputError);
    expect(player.team).toBe(oldTeam);
    expect(stores.players.save).not.toHaveBeenCalled();
  });
});
