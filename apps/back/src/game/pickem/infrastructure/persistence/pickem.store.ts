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
function toPick(row: PickemChoice): Pick {
  return {
    id: row.id,
    user: { id: row.user.id },
    match: { id: row.match.id },
    pickedParticipant: { id: row.pickedParticipant.id },
    points: row.points,
    scored: row.scored,
    createdAt: new Date(row.createdAt),
  };
}
function toNamedPick(row: PickemChoice): NamedPick {
  return { ...toPick(row), user: { id: row.user.id, userName: row.user.userName } };
}
/** Serializes picks and scoring of one match, so a pick is never read as unscored while it is being scored. */
async function lockMatchPicks(tx: EntityManager, matchId: string): Promise<void> {
  await tx.execute("select pg_advisory_xact_lock(hashtextextended(?, 0))", [
    "pickem:match:" + matchId,
  ]);
}
interface TournamentPickFilter {
  match: { tournament: { id: string } };
  user?: { id: string };
  scored?: boolean;
}
export class MikroPickemStore implements PickemReads, PickemTransaction {
  constructor(private readonly em: EntityManager) {}
  async list(tournamentId: string, { userId, scoredOnly }: PickFilter = {}): Promise<NamedPick[]> {
    const where: TournamentPickFilter = { match: { tournament: { id: tournamentId } } };
    if (userId) where.user = { id: userId };
    if (scoredOnly) where.scored = true;
    return (
      await this.em.find(PickemChoice, where, { populate: ["user", "match", "pickedParticipant"] })
    ).map(toNamedPick);
  }
  run<T>(work: (scope: PickemWrites) => Promise<T>): Promise<T> {
    return this.em.transactional(async (tx) => {
      const scope: PickemWrites = {
        userExists: async (id) => !!(await tx.findOne(User, { id })),
        participantExists: async (id) => !!(await tx.findOne(TournamentParticipant, { id })),
        pick: async (userId, matchId) => {
          await lockMatchPicks(tx, matchId);
          const row = await tx.findOne(
            PickemChoice,
            { user: { id: userId }, match: { id: matchId } },
            { populate: ["user", "match", "pickedParticipant"], refresh: true },
          );
          return row ? toPick(row) : null;
        },
        unscored: async (matchId) => {
          await lockMatchPicks(tx, matchId);
          return (
            await tx.find(
              PickemChoice,
              { match: { id: matchId }, scored: false },
              { populate: ["user", "match", "pickedParticipant"], refresh: true },
            )
          ).map(toPick);
        },
        savePick: async (pick) => {
          const row = (await tx.findOne(PickemChoice, { id: pick.id })) ?? new PickemChoice();
          Object.assign(row, {
            id: pick.id,
            user: tx.getReference(User, pick.user.id),
            match: tx.getReference(Match, pick.match.id),
            pickedParticipant: tx.getReference(TournamentParticipant, pick.pickedParticipant.id),
            points: pick.points,
            scored: pick.scored,
            createdAt: pick.createdAt,
          });
          tx.persist(row);
        },
      };
      const result = await work(scope);
      await tx.flush();
      return result;
    });
  }
}
