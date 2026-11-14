import type { EntityManager } from "@mikro-orm/postgresql";
import type { MatchGameStats, MatchGameTeamStats, TournamentStatsGame } from "@sarpbc/types";
import { mapSequentially } from "../../../common/application/sequentially";
import type {
  GameAttachment,
  GameRecord,
  GameStatsStore,
  PlatformAccount,
  PlayerLink,
} from "../../application/ports";
import type { PlayerGameLine } from "../../domain/player-stats";
import type { GameLocation, Side } from "../../domain/replay-matching";
import { MatchGame } from "./match-game.entity";
import { MatchGameExclusion } from "./match-game-exclusion.entity";
import { MatchGamePlayer } from "./match-game-player.entity";
import { PlayerPlatformLink } from "./player-platform-link.entity";
import { nameOf } from "./participant-name";
import { toLink } from "./player-link.store";

function toTeam(game: MatchGame, side: Side): MatchGameTeamStats {
  return {
    participantId: (side === "blue" ? game.blueParticipant : game.orangeParticipant).id,
    goals: side === "blue" ? game.blueGoals : game.orangeGoals,
    players: game.players
      .getItems()
      .filter((row) => row.side === side)
      .toSorted((a, b) => a.name.localeCompare(b.name))
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
    if (replayIds.length === 0) {
      return new Map();
    }

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
    if (replayIds.length === 0) {
      return new Set();
    }

    const rows = await this.em.findAll(MatchGameExclusion, {
      where: { ballchasingId: { $in: replayIds } },
    });

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
    if (accounts.length === 0) {
      return [];
    }

    const rows = await this.em.findAll(PlayerPlatformLink, { where: { $or: accounts } });

    return rows.map(toLink);
  }

  async save(game: GameRecord): Promise<TournamentStatsGame> {
    return await this.em.transactional(async (em) => {
      await em.nativeDelete(MatchGameExclusion, { ballchasingId: game.ballchasingId });

      await mapSequentially(game.learnedLinks, async ({ playerId, ...account }) => {
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
      });

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

      for (const player of game.players) {
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
      }

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

  async playerLines(tournamentIds: string[]): Promise<PlayerGameLine[]> {
    const rows = await this.em.find(
      MatchGamePlayer,
      { game: { match: { tournament: { $in: tournamentIds } } } },
      {
        populate: [
          "player",
          "game.blueParticipant.team",
          "game.blueParticipant.players",
          "game.orangeParticipant.team",
          "game.orangeParticipant.players",
        ],
      },
    );

    return rows.map((row) => {
      const participant =
        row.side === "blue" ? row.game.blueParticipant : row.game.orangeParticipant;

      return {
        gameId: row.game.id,
        account: JSON.stringify([row.platform, row.platformId ?? row.name]),
        player: row.player
          ? { id: row.player.id, name: row.player.name, slug: row.player.slug }
          : null,
        team: {
          id: participant.team?.id ?? null,
          name: nameOf(participant),
          slug: participant.team?.slug ?? null,
        },
        teamGoals: row.side === "blue" ? row.game.blueGoals : row.game.orangeGoals,
        goals: row.goals,
        assists: row.assists,
        saves: row.saves,
        shots: row.shots,
        demolitions: row.demolitions,
      };
    });
  }

  async remove(tournamentId: string, location: GameLocation): Promise<TournamentStatsGame | null> {
    return await this.em.transactional(async (em) => {
      const game = await em.findOne(MatchGame, {
        match: { id: location.matchId, tournament: tournamentId },
        number: location.number,
      });

      if (!game) {
        return null;
      }

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
