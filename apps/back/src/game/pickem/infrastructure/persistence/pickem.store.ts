import { EntityManager } from "@mikro-orm/postgresql";
import {
  Match,
  TournamentParticipant,
} from "../../../../tournament/infrastructure/competition-persistence";
import { User } from "../../../../user/infrastructure/user-persistence";
import { PickemChoice } from "./pickem.entity";
import type { NamedPick, Pick } from "../../domain/pickem";
import type {
  PickFilter,
  PickemReads,
  PickemTransaction,
  PickemWrites,
} from "../../application/ports";

const toPick = (row: PickemChoice): Pick => ({
  createdAt: new Date(row.createdAt),
  id: row.id,
  match: { id: row.match.id },
  pickedParticipant: { id: row.pickedParticipant.id },
  points: row.points,
  scored: row.scored,
  user: { id: row.user.id },
});

const toNamedPick = (row: PickemChoice): NamedPick => ({
  ...toPick(row),
  user: { id: row.user.id, userName: row.user.userName },
});

/** Serializes picks and scoring of one match, so a pick is never read as unscored while it is being scored. */
const lockMatchPicks = async (tx: EntityManager, matchId: string): Promise<void> => {
  await tx.execute("select pg_advisory_xact_lock(hashtextextended(?, 0))", [
    `pickem:match:${matchId}`,
  ]);
};

interface TournamentPickFilter {
  match: { tournament: { id: string } };
  user?: { id: string };
  scored?: boolean;
}

export class MikroPickemStore implements PickemReads, PickemTransaction {
  constructor(private readonly em: EntityManager) {}
  async list(tournamentId: string, { userId, scoredOnly }: PickFilter = {}): Promise<NamedPick[]> {
    const where: TournamentPickFilter = { match: { tournament: { id: tournamentId } } };

    if (userId !== undefined && userId !== "") {
      where.user = { id: userId };
    }

    if (scoredOnly === true) {
      where.scored = true;
    }

    const rows = await this.em.find(PickemChoice, where, {
      populate: ["user", "match", "pickedParticipant"],
    });

    return rows.map(toNamedPick);
  }
  async run<T>(work: (scope: PickemWrites) => Promise<T>): Promise<T> {
    return await this.em.transactional(async (tx) => {
      const scope: PickemWrites = {
        participantExists: async (id) => !!(await tx.findOne(TournamentParticipant, { id })),
        pick: async (userId, matchId) => {
          await lockMatchPicks(tx, matchId);

          const row = await tx.findOne(
            PickemChoice,
            { match: { id: matchId }, user: { id: userId } },
            { populate: ["user", "match", "pickedParticipant"], refresh: true },
          );

          return row ? toPick(row) : null;
        },
        savePick: async (pick) => {
          const row = (await tx.findOne(PickemChoice, { id: pick.id })) ?? new PickemChoice();
          Object.assign(row, {
            createdAt: pick.createdAt,
            id: pick.id,
            match: tx.getReference(Match, pick.match.id),
            pickedParticipant: tx.getReference(TournamentParticipant, pick.pickedParticipant.id),
            points: pick.points,
            scored: pick.scored,
            user: tx.getReference(User, pick.user.id),
          });
          tx.persist(row);
        },
        unscored: async (matchId) => {
          await lockMatchPicks(tx, matchId);

          const rows = await tx.find(
            PickemChoice,
            { match: { id: matchId }, scored: false },
            { populate: ["user", "match", "pickedParticipant"], refresh: true },
          );

          return rows.map(toPick);
        },
        userExists: async (id) => !!(await tx.findOne(User, { id })),
      };

      const result = await work(scope);
      await tx.flush();

      return result;
    });
  }
}
