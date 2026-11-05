import { EntityManager } from "@mikro-orm/postgresql";
import type { MatchGameStats, MatchGameTeamStats } from "@sarpbc/types";
import { Match as CompetitionMatch } from "../../../tournament/domain/competition";
import { Match, Tournament } from "../../../tournament/infrastructure/competition-persistence";
import type {
  GameRecord,
  GameStatsStore,
  StatsCandidates,
  StatsImportStore,
} from "../../application/ports";
import type { CandidateMatch, Side } from "../../domain/replay-matching";
import type { StatsImport } from "../../domain/stats-import";
import { MatchGame, MatchGamePlayer, MatchStatsImport } from "./match-stats.entities";

function toTeam(game: MatchGame, side: Side): MatchGameTeamStats {
  return {
    participantId: (side === "blue" ? game.blueParticipant : game.orangeParticipant).id,
    goals: side === "blue" ? game.blueGoals : game.orangeGoals,
    players: game.players
      .getItems()
      .filter((row) => row.side === side)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((row) => ({
        name: row.name,
        player: row.player
          ? { id: row.player.id, name: row.player.name, slug: row.player.slug }
          : null,
        goals: row.goals,
        assists: row.assists,
        saves: row.saves,
        shots: row.shots,
        demolitions: row.demolitions,
      })),
  };
}

export class MikroOrmGameStatsStore implements GameStatsStore {
  constructor(private readonly em: EntityManager) {}

  async importedReplayIds(replayIds: string[]): Promise<Set<string>> {
    if (replayIds.length === 0) return new Set();
    const rows = await this.em.find(
      MatchGame,
      { ballchasingId: { $in: replayIds } },
      { fields: ["ballchasingId"] },
    );
    return new Set(rows.map((row) => row.ballchasingId));
  }

  async save(game: GameRecord): Promise<void> {
    await this.em.transactional(async (em) => {
      const row = em.create(MatchGame, {
        match: game.matchId,
        number: game.number,
        ballchasingId: game.ballchasingId,
        rocketLeagueId: game.rocketLeagueId,
        playedAt: game.playedAt,
        blueParticipant: game.blueParticipantId,
        orangeParticipant: game.orangeParticipantId,
        blueGoals: game.blueGoals,
        orangeGoals: game.orangeGoals,
        createdAt: new Date(),
      });
      for (const player of game.players)
        em.create(MatchGamePlayer, {
          game: row,
          side: player.side,
          player: player.playerId,
          name: player.name,
          platform: player.platform,
          platformId: player.platformId,
          goals: player.goals,
          assists: player.assists,
          saves: player.saves,
          shots: player.shots,
          demolitions: player.demolitions,
        });
    });
  }

  async byMatch(matchId: string): Promise<MatchGameStats[]> {
    const games = await this.em.find(
      MatchGame,
      { match: matchId },
      { populate: ["players.player"], orderBy: { number: "ASC" } },
    );
    return games.map((game) => ({
      number: game.number,
      ballchasingId: game.ballchasingId,
      playedAt: game.playedAt?.toISOString() ?? null,
      teams: [toTeam(game, "blue"), toTeam(game, "orange")],
    }));
  }
}

export class MikroOrmStatsCandidates implements StatsCandidates {
  constructor(private readonly em: EntityManager) {}

  async tournamentExists(tournamentId: string): Promise<boolean> {
    return (await this.em.count(Tournament, { id: tournamentId })) > 0;
  }

  async matches(tournamentId: string): Promise<CandidateMatch[]> {
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
      id: match.id,
      beginAt: match.beginAt,
      endAt: match.endAt,
      finished: Object.assign(new CompetitionMatch(), {
        status: match.status,
        endAt: match.endAt,
      }).hasEnded(),
      numberOfGames: match.numberOfGames,
      participants: match.participants.getItems().map((participant) => ({
        id: participant.id,
        teamName: participant.team.name,
        players: participant.players.getItems().map(({ id, name }) => ({ id, name })),
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

function toImport(row: MatchStatsImport): StatsImport {
  return {
    id: row.id,
    tournamentId: row.tournament.id,
    groupId: row.groupId,
    status: row.status,
    total: row.total,
    processed: row.processed,
    items: [...row.items],
    error: row.error,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
  };
}

export class MikroOrmStatsImportStore implements StatsImportStore {
  constructor(private readonly em: EntityManager) {}

  async create({ tournamentId, ...statsImport }: StatsImport): Promise<void> {
    this.em.create(MatchStatsImport, { ...statsImport, tournament: tournamentId });
    await this.em.flush();
  }

  async load(id: string): Promise<StatsImport | null> {
    const row = await this.em.findOne(MatchStatsImport, id, { refresh: true });
    return row ? toImport(row) : null;
  }

  async save(statsImport: StatsImport): Promise<void> {
    const row = await this.em.findOneOrFail(MatchStatsImport, statsImport.id);
    this.em.assign(row, {
      status: statsImport.status,
      total: statsImport.total,
      processed: statsImport.processed,
      items: [...statsImport.items],
      error: statsImport.error,
      startedAt: statsImport.startedAt,
      finishedAt: statsImport.finishedAt,
    });
    await this.em.flush();
  }

  async latest(tournamentId: string, limit: number): Promise<StatsImport[]> {
    const rows = await this.em.find(
      MatchStatsImport,
      { tournament: tournamentId },
      { orderBy: { createdAt: "DESC" }, limit },
    );
    return rows.map(toImport);
  }

  failUnfinished(error: string): Promise<number> {
    return this.em.nativeUpdate(
      MatchStatsImport,
      { status: { $in: ["pending", "running"] } },
      { status: "failed", error, finishedAt: new Date() },
    );
  }
}
