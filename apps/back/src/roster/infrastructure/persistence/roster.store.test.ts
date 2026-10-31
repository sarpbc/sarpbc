import { describe, expect, it, vi } from "vitest";
import type { EntityManager } from "@mikro-orm/postgresql";
import { Player as PlayerRow } from "./player.entities";
import { Player } from "../../domain/roster";
import { MikroPlayerStore, moveTeamPrizes } from "./roster.store";
import { TournamentPrize } from "../../../tournament/infrastructure/persistence/tournament-prize.entities";

function fixture() {
  const execute = vi.fn();
  const findOne = vi.fn();
  const manager: Pick<EntityManager, "getConnection" | "findOne"> = {
    getConnection: vi.fn().mockReturnValue({ execute }),
    findOne,
  };

  return { execute, findOne, players: new MikroPlayerStore(manager as EntityManager) };
}

describe("MikroPlayerStore.getRandomPlayer", () => {
  it("loads a single random row and maps it to a detached player", async () => {
    const { execute, findOne, players } = fixture();
    const row = Object.assign(new PlayerRow(), {
      id: "p1",
      name: "Vatira",
      slug: "vatira",
    });
    execute.mockResolvedValue([{ id: row.id }]);
    findOne.mockResolvedValue(row);

    const result = await players.getRandomPlayer();

    expect(execute).toHaveBeenCalledWith(
      "SELECT id FROM player WHERE merged_into_id IS NULL ORDER BY random() LIMIT 1",
    );
    expect(findOne).toHaveBeenCalledWith(
      PlayerRow,
      { id: row.id },
      { populate: ["team", "photos"] },
    );
    expect(result).toBeInstanceOf(Player);
    expect(result).not.toBe(row);
    expect(result).toMatchObject({ id: "p1", name: "Vatira", slug: "vatira", photos: [] });
  });

  it("returns null when the table is empty without loading a player", async () => {
    const { execute, findOne, players } = fixture();
    execute.mockResolvedValue([]);

    await expect(players.getRandomPlayer()).resolves.toBeNull();

    expect(execute).toHaveBeenCalledWith(
      "SELECT id FROM player WHERE merged_into_id IS NULL ORDER BY random() LIMIT 1",
    );
    expect(findOne).not.toHaveBeenCalled();
  });
});

describe("moveTeamPrizes", () => {
  function prize(id: string, teamId: string, tournamentId: string, playerIds: string[]) {
    return {
      id,
      team: { id: teamId },
      tournament: { id: tournamentId },
      players: { add: vi.fn(), getItems: () => playerIds.map((playerId) => ({ id: playerId })) },
    };
  }

  it("folds a duplicate prize on a shared tournament into the kept team before moving the rest", async () => {
    const kept = prize("kept-cup", "kc", "cup", ["zen"]);
    const duplicate = prize("dup-cup", "kc-dup", "cup", ["vatira"]);
    const moved = prize("dup-open", "kc-dup", "open", ["atow"]);
    const find = vi.fn().mockResolvedValue([kept, duplicate, moved]);
    const nativeDelete = vi.fn();
    const nativeUpdate = vi.fn();

    await moveTeamPrizes({ find, nativeDelete, nativeUpdate }, "kc-dup", "kc");

    expect(kept.players.add).toHaveBeenCalledWith([{ id: "vatira" }]);
    expect(nativeDelete).toHaveBeenCalledWith(TournamentPrize, { id: { $in: ["dup-cup"] } });
    expect(nativeUpdate).toHaveBeenCalledWith(TournamentPrize, { team: "kc-dup" }, { team: "kc" });
    expect(nativeDelete.mock.invocationCallOrder[0]).toBeLessThan(
      nativeUpdate.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("moves prizes without deleting when the teams never shared a tournament", async () => {
    const find = vi.fn().mockResolvedValue([prize("dup-open", "kc-dup", "open", [])]);
    const nativeDelete = vi.fn();
    const nativeUpdate = vi.fn();

    await moveTeamPrizes({ find, nativeDelete, nativeUpdate }, "kc-dup", "kc");

    expect(nativeDelete).not.toHaveBeenCalled();
    expect(nativeUpdate).toHaveBeenCalledWith(TournamentPrize, { team: "kc-dup" }, { team: "kc" });
  });
});
