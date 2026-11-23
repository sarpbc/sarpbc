import { EntityManager } from "@mikro-orm/postgresql";
import { isMatchFinished } from "@sarpbc/utils";
import { Match, Tournament } from "../../../tournament/infrastructure/competition-persistence";
import type { StatsCandidates } from "../../application/ports";
import { MatchGameReplay } from "./match-game-replay.entity";
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
      MatchGameReplay,
      { game: { match: { $in: matches.map((match) => match.id) } } },
      { populate: ["game"] },
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
        .filter((replay) => replay.game.match.id === match.id)
        .map((replay) => replay.ballchasingId),
    }));
  }
}
