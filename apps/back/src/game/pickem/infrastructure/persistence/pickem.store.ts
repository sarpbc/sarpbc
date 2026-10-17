import { EntityManager } from "@mikro-orm/postgresql";
import { LockMode } from "@mikro-orm/core";
import {
  Match,
  TournamentParticipant,
} from "../../../../tournament/infrastructure/competition-persistence";
import { User } from "../../../../user/infrastructure/persistence/user.entity";
import { PickemChoice } from "./pickem.entity";
import type { Pick } from "../../domain/pickem";
import type { PickemReads, PickemTransaction, PickemWrites } from "../../application/ports";
function toPick(row: PickemChoice): Pick {
  return {
    id: row.id,
    user: { id: row.user.id, userName: row.user.userName },
    match: { id: row.match.id },
    pickedParticipant: { id: row.pickedParticipant.id },
    points: row.points,
    scored: row.scored,
    createdAt: new Date(row.createdAt),
  };
}
interface TournamentPickFilter {
  match: { tournament: { id: string } };
  user?: { id: string };
  scored?: boolean;
}
export class MikroPickemStore implements PickemReads, PickemTransaction {
  constructor(private readonly em: EntityManager) {}
  async list(tournamentId: string, userId?: string, scoredOnly?: boolean): Promise<Pick[]> {
    const where: TournamentPickFilter = { match: { tournament: { id: tournamentId } } };
    if (userId) where.user = { id: userId };
    if (scoredOnly) where.scored = true;
    return (
      await this.em.find(PickemChoice, where, { populate: ["user", "match", "pickedParticipant"] })
    ).map(toPick);
  }
  run<T>(work: (scope: PickemWrites) => Promise<T>): Promise<T> {
    return this.em.transactional(async (tx) => {
      const scope: PickemWrites = {
        userExists: async (id) => !!(await tx.findOne(User, { id })),
        participantExists: async (id) => !!(await tx.findOne(TournamentParticipant, { id })),
        match: async (id) => {
          const row = await tx.findOne(
            Match,
            { id },
            { refresh: true, lockMode: LockMode.PESSIMISTIC_WRITE },
          );
          if (row)
            await tx.populate(
              row,
              ["tournament", "participants", "results", "results.participant", "winner"],
              { refresh: true },
            );
          return row
            ? {
                id: row.id,
                pickemsEnabled: row.tournament.pickemsEnabled,
                beginAt: row.beginAt,
                endAt: row.endAt,
                status: row.status,
                participantIds: row.participants.getItems().map((p) => p.id),
                winnerId: row.winner?.id ?? null,
                results: row.results
                  .getItems()
                  .map((r) => ({ participantId: r.participant.id, score: r.score })),
              }
            : null;
        },
        pick: async (userId, matchId) => {
          const row = await tx.findOne(
            PickemChoice,
            { user: { id: userId }, match: { id: matchId } },
            { populate: ["user", "match", "pickedParticipant"], refresh: true },
          );
          return row ? toPick(row) : null;
        },
        unscored: async (matchId) =>
          (
            await tx.find(
              PickemChoice,
              { match: { id: matchId }, scored: false },
              { populate: ["user", "match", "pickedParticipant"], refresh: true },
            )
          ).map(toPick),
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
        setWinner: async (matchId, winnerId) => {
          const row = await tx.findOneOrFail(Match, { id: matchId });
          row.winner = tx.getReference(TournamentParticipant, winnerId);
          if (!row.status) row.status = "finished";
        },
      };
      const result = await work(scope);
      await tx.flush();
      return result;
    });
  }
}
