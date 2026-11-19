import { EntityManager } from "@mikro-orm/postgresql";
import { isMatchFinished } from "@sarpbc/utils";
import { Match, Tournament } from "../../../tournament/infrastructure/competition-persistence";
import type { StatsCandidates } from "../../application/ports";
import { MatchGame } from "./match-game.entity";
import { nameOf } from "./participant-name";

export class MikroOrmStatsCandidates implements StatsCandidates {
  constructor(private readonly em: EntityManager) {}

  async tournamentExists(tournamentId: string) {
    return (await this.em.count(Tournament, { id: tournamentId })) > 0;
  }

  async matches(tournamentId: string) {
    const matches = await this.em.find(
      Match,
      { tournament: tournamentId },
      { populate: ["participants.team", "participants.players", "results.participant"] },
    );

    const stored = await this.em.find(
      MatchGame,
      { match: { $in: matches.map((match) => match.id) } },
      { fields: ["ballchasingId", "match"] },
    );

    return matches.map((match) => ({
      beginAt: match.beginAt,
      endAt: match.endAt,
      finished: isMatchFinished(match),
      id: match.id,
      numberOfGames: match.numberOfGames,
      participants: match.participants.getItems().map((participant) => ({
        id: participant.id,
        players: participant.players.getItems().map(({ id, name }) => ({ id, name })),
        teamNames: [
          nameOf(participant),
          ...(participant.team?.aliases ?? []).map(({ name }) => name),
        ],
      })),
      scores: new Map(
        match.results.getItems().map((result) => [result.participant.id, result.score]),
      ),
      storedReplayIds: stored
        .filter((game) => game.match.id === match.id)
        .map((game) => game.ballchasingId),
    }));
  }
}
