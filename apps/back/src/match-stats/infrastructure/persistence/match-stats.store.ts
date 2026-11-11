import { EntityManager, QueryOrder } from "@mikro-orm/postgresql";
import type {
  MatchGameStats,
  MatchGameTeamStats,
  StatsPlayerAccount,
  StatsRoster,
  TournamentStatsGame,
} from "@sarpbc/types";
import { isMatchFinished, participantName } from "@sarpbc/utils";
import {
  Match,
  Tournament,
  TournamentParticipant,
} from "../../../tournament/infrastructure/competition-persistence";
import type {
  GameAttachment,
  GameRecord,
  GameStatsStore,
  PlatformAccount,
  PlayerLink,
  PlayerLinkStore,
  StatsCandidates,
  StatsImportStore,
} from "../../application/ports";
import type { CandidateMatch, GameLocation, Side } from "../../domain/replay-matching";
import { ACTIVE_IMPORT_STATUSES, type StatsImport } from "../../domain/stats-import";
import {
  MatchGame,
  MatchGameExclusion,
  MatchGamePlayer,
  MatchStatsImport,
  PlayerPlatformLink,
} from "./match-stats.entities";

function nameOf(participant: TournamentParticipant): string {
  return participantName({ team: participant.team, players: participant.players.getItems() });
}

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

function toTournamentGame(game: MatchGame): TournamentStatsGame {
  return {
    matchId: game.match.id,
    number: game.number,
    ballchasingId: game.ballchasingId,
    playedAt: game.playedAt?.toISOString() ?? null,
    blueParticipantId: game.blueParticipant.id,
    orangeParticipantId: game.orangeParticipant.id,
    blueGoals: game.blueGoals,
    orangeGoals: game.orangeGoals,
  };
}

export class MikroOrmGameStatsStore implements GameStatsStore {
  constructor(private readonly em: EntityManager) {}

  async locations(replayIds: string[]): Promise<Map<string, GameLocation>> {
    if (replayIds.length === 0) return new Map();
    const rows = await this.em.find(
      MatchGame,
      { ballchasingId: { $in: replayIds } },
      { fields: ["ballchasingId", "match", "number"] },
    );
    return new Map(
      rows.map((row) => [row.ballchasingId, { matchId: row.match.id, number: row.number }]),
    );
  }

  async excluded(replayIds: string[]): Promise<Set<string>> {
    if (replayIds.length === 0) return new Set();
    const rows = await this.em.find(MatchGameExclusion, { ballchasingId: { $in: replayIds } });
    return new Set(rows.map((row) => row.ballchasingId));
  }

  async attachment(replayId: string): Promise<GameAttachment | null> {
    const game = await this.em.findOne(
      MatchGame,
      { ballchasingId: replayId },
      {
        populate: [
          "match.tournament",
          "blueParticipant.team",
          "blueParticipant.players",
          "orangeParticipant.team",
          "orangeParticipant.players",
        ],
      },
    );
    return game
      ? {
          matchId: game.match.id,
          number: game.number,
          tournamentName: game.match.tournament.name,
          teams: [nameOf(game.blueParticipant), nameOf(game.orangeParticipant)],
        }
      : null;
  }

  async links(accounts: PlatformAccount[]): Promise<PlayerLink[]> {
    if (accounts.length === 0) return [];
    const rows = await this.em.find(PlayerPlatformLink, { $or: accounts });
    return rows.map(toLink);
  }

  save(game: GameRecord): Promise<TournamentStatsGame> {
    return this.em.transactional(async (em) => {
      await em.nativeDelete(MatchGameExclusion, { ballchasingId: game.ballchasingId });
      for (const { playerId, ...account } of game.learnedLinks) {
        await em.upsert(
          PlayerPlatformLink,
          { ...account, player: playerId },
          { onConflictFields: ["platform", "platformId"], onConflictAction: "ignore" },
        );
        const kept = await em.findOneOrFail(PlayerPlatformLink, account, { refresh: true });
        await em.nativeUpdate(
          MatchGamePlayer,
          { ...account, player: null },
          { player: kept.player },
        );
      }
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
      return toTournamentGame(row);
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

  async inTournament(tournamentId: string): Promise<TournamentStatsGame[]> {
    const games = await this.em.find(
      MatchGame,
      { match: { tournament: tournamentId } },
      { orderBy: { number: "ASC" } },
    );
    return games.map(toTournamentGame);
  }

  remove(tournamentId: string, location: GameLocation): Promise<TournamentStatsGame | null> {
    return this.em.transactional(async (em) => {
      const game = await em.findOne(MatchGame, {
        match: { id: location.matchId, tournament: tournamentId },
        number: location.number,
      });
      if (!game) return null;
      const removed = toTournamentGame(game);
      await em.nativeDelete(MatchGame, { id: game.id });
      await em.upsert(
        MatchGameExclusion,
        { ballchasingId: game.ballchasingId },
        { onConflictFields: ["ballchasingId"], onConflictAction: "ignore" },
      );
      return removed;
    });
  }
}

function toLink(row: PlayerPlatformLink): PlayerLink {
  return { platform: row.platform, platformId: row.platformId, playerId: row.player.id };
}

export class MikroOrmPlayerLinkStore implements PlayerLinkStore {
  constructor(private readonly em: EntityManager) {}

  async accounts(tournamentId: string): Promise<StatsPlayerAccount[]> {
    const rows = await this.em.find(
      MatchGamePlayer,
      { platformId: { $ne: null }, game: { match: { tournament: tournamentId } } },
      {
        populate: [
          "player",
          "game.blueParticipant.team",
          "game.blueParticipant.players",
          "game.orangeParticipant.team",
          "game.orangeParticipant.players",
        ],
        orderBy: { game: { playedAt: QueryOrder.DESC_NULLS_LAST } },
      },
    );
    const accounts = new Map<string, StatsPlayerAccount>();
    for (const row of rows) {
      const key = JSON.stringify([row.platform, row.platformId]);
      const known = accounts.get(key);
      if (known) {
        known.games += 1;
        continue;
      }
      const participant =
        row.side === "blue" ? row.game.blueParticipant : row.game.orangeParticipant;
      accounts.set(key, {
        platform: row.platform,
        platformId: row.platformId!,
        name: row.name,
        team: { participantId: participant.id, name: nameOf(participant) },
        games: 1,
        player: row.player ? { id: row.player.id, name: row.player.name } : null,
      });
    }
    return [...accounts.values()].sort(
      (a, b) => a.team.name.localeCompare(b.team.name) || a.name.localeCompare(b.name),
    );
  }

  async rosters(tournamentId: string): Promise<StatsRoster[]> {
    const participants = await this.em.find(
      TournamentParticipant,
      { tournament: tournamentId },
      { populate: ["team", "players"] },
    );
    return participants
      .map((participant) => ({
        participantId: participant.id,
        teamName: nameOf(participant),
        players: participant.players
          .getItems()
          .map(({ id, name }) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.teamName.localeCompare(b.teamName));
  }

  async onTournamentRoster(tournamentId: string, playerId: string): Promise<boolean> {
    return (
      (await this.em.count(TournamentParticipant, {
        tournament: tournamentId,
        players: playerId,
      })) > 0
    );
  }

  link({ playerId, ...account }: PlayerLink): Promise<number> {
    return this.em.transactional(async (em) => {
      await em.upsert(
        PlayerPlatformLink,
        { ...account, player: playerId },
        {
          onConflictFields: ["platform", "platformId"],
          onConflictAction: "merge",
          onConflictMergeFields: ["player"],
        },
      );
      return em.nativeUpdate(MatchGamePlayer, account, { player: playerId });
    });
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
      finished: isMatchFinished(match),
      numberOfGames: match.numberOfGames,
      participants: match.participants.getItems().map((participant) => ({
        id: participant.id,
        name: nameOf(participant),
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
      { status: { $in: [...ACTIVE_IMPORT_STATUSES] } },
      { status: "failed", error, finishedAt: new Date() },
    );
  }
}
