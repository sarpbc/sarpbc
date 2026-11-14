import { EntityManager } from "@mikro-orm/postgresql";
import { mapSequentially } from "../../../common/application/sequentially";
import { Player as PlayerRow } from "./player.entity";
import { Team as TeamRow } from "./team.entity";
import { TeamAlias as TeamAliasRow } from "./team-alias.entity";
import { Contract as ContractRow } from "./contract.entity";
import { PlayerPhoto as PlayerPhotoRow } from "./player-photo.entity";
import type {
  RosterMergeTransaction,
  RosterMergeWriteScope,
  RosterReferenceMover,
  SharedTournaments,
} from "../../application/ports";
import { writeScope } from "./roster.transaction";

export interface RosterMergeParticipants extends SharedTournaments {
  movers: readonly RosterReferenceMover[];
}

function rosterReferences(
  em: EntityManager,
  others: RosterMergeParticipants,
): RosterReferenceMover & SharedTournaments {
  const mergeOpenContracts = async (owner: "player" | "team", from: string, to: string) => {
    const shared = owner === "player" ? "team" : "player";

    const open = await em.find(
      ContractRow,
      { [owner]: { $in: [from, to] }, endDate: null },
      { disableIdentityMap: true },
    );

    const duplicates = open.filter(
      (contract) =>
        contract[owner].id === from &&
        open.some((kept) => kept[owner].id === to && kept[shared].id === contract[shared].id),
    );

    await mapSequentially(
      open.filter((contract) => contract[owner].id === to),
      async (kept) => {
        const starts = [kept, ...duplicates.filter((d) => d[shared].id === kept[shared].id)].map(
          ({ startDate }) => new Date(startDate).getTime(),
        );

        if (starts.length > 1) {
          await em.nativeUpdate(
            ContractRow,
            { id: kept.id },
            { startDate: new Date(Math.min(...starts)) },
          );
        }
      },
    );

    await em.nativeDelete(ContractRow, { id: { $in: duplicates.map(({ id }) => id) } });
  };

  return {
    movePlayer: async (from, to) => {
      // Frees the unique PandaScore id before the kept player takes it in the same flush.
      await em.nativeUpdate(PlayerRow, { id: from }, { pandascoreId: null });
      await em.nativeUpdate(PlayerRow, { mergedInto: from }, { mergedInto: to });
      await mergeOpenContracts("player", from, to);
      await em.nativeUpdate(ContractRow, { player: from }, { player: to });
      await em.nativeUpdate(PlayerPhotoRow, { player: from }, { player: to });

      await mapSequentially(others.movers, async (mover) => {
        await mover.movePlayer(from, to);
      });
    },
    moveTeam: async (from, to) => {
      await em.nativeUpdate(TeamRow, { mergedInto: from }, { mergedInto: to });
      await em.nativeUpdate(TeamAliasRow, { team: from }, { team: to });
      await mergeOpenContracts("team", from, to);
      await em.nativeUpdate(ContractRow, { team: from }, { team: to });
      await em.nativeUpdate(PlayerRow, { team: from }, { team: to });

      await mapSequentially(others.movers, async (mover) => {
        await mover.moveTeam(from, to);
      });
    },
    sharedTournamentIds: async (teamId, otherTeamId) =>
      await others.sharedTournamentIds(teamId, otherTeamId),
  };
}

export class MikroRosterMergeTransaction implements RosterMergeTransaction {
  constructor(
    private readonly em: EntityManager,
    private readonly participantsFor: (tx: EntityManager) => RosterMergeParticipants,
  ) {}
  async run<T>(work: (scope: RosterMergeWriteScope) => Promise<T>): Promise<T> {
    return await this.em.transactional(async (tx) => {
      const result = await work({
        ...writeScope(tx),
        references: rosterReferences(tx, this.participantsFor(tx)),
      });

      await tx.flush();

      return result;
    });
  }
}
