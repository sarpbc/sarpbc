import { describe, expect, it, vi } from "vitest";
import { EntityManager } from "@mikro-orm/postgresql";
import { unconstructed } from "../../../../test/doubles";
import { TournamentRosterReferences } from "./roster-references.mover";
import { TournamentPrize } from "./tournament-prize.entities";

describe("TournamentRosterReferences.moveTeam prizes", () => {
  function prize(id: string, teamId: string, tournamentId: string, playerIds: string[]) {
    return {
      id,
      team: { id: teamId },
      tournament: { id: tournamentId },
      players: { add: vi.fn(), getItems: () => playerIds.map((playerId) => ({ id: playerId })) },
    };
  }

  function mover(prizes: ReturnType<typeof prize>[]) {
    const find = vi.fn().mockResolvedValue(prizes);
    const nativeDelete = vi.fn();
    const nativeUpdate = vi.fn();

    const references = new TournamentRosterReferences(
      Object.assign(unconstructed(EntityManager), { find, nativeDelete, nativeUpdate }),
    );

    const prizeUpdateOrder = () =>
      nativeUpdate.mock.invocationCallOrder[
        nativeUpdate.mock.calls.findIndex(([entity]) => entity === TournamentPrize)
      ] ?? 0;

    return { references, nativeDelete, nativeUpdate, prizeUpdateOrder };
  }

  it("folds a duplicate prize on a shared tournament into the kept team before moving the rest", async () => {
    const kept = prize("kept-cup", "kc", "cup", ["zen"]);
    const duplicate = prize("dup-cup", "kc-dup", "cup", ["vatira"]);
    const moved = prize("dup-open", "kc-dup", "open", ["atow"]);

    const { references, nativeDelete, nativeUpdate, prizeUpdateOrder } = mover([
      kept,
      duplicate,
      moved,
    ]);

    await references.moveTeam("kc-dup", "kc");

    expect(kept.players.add).toHaveBeenCalledWith([{ id: "vatira" }]);
    expect(nativeDelete).toHaveBeenCalledWith(TournamentPrize, { id: { $in: ["dup-cup"] } });
    expect(nativeUpdate).toHaveBeenCalledWith(TournamentPrize, { team: "kc-dup" }, { team: "kc" });
    expect(nativeDelete.mock.invocationCallOrder[0]).toBeLessThan(prizeUpdateOrder());
  });

  it("moves prizes without deleting when the teams never shared a tournament", async () => {
    const { references, nativeDelete, nativeUpdate } = mover([
      prize("dup-open", "kc-dup", "open", []),
    ]);

    await references.moveTeam("kc-dup", "kc");

    expect(nativeDelete).not.toHaveBeenCalled();
    expect(nativeUpdate).toHaveBeenCalledWith(TournamentPrize, { team: "kc-dup" }, { team: "kc" });
  });
});
