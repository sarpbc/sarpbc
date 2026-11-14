import { EntityManager } from "@mikro-orm/postgresql";
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

const toTeam = (game: MatchGame, side: Side): MatchGameTeamStats => ({
  goals: side === "blue" ? game.blueGoals : game.orangeGoals,
  participantId: (side === "blue" ? game.blueParticipant : game.orangeParticipant).id,
  players: game.players
    .getItems()
    .filter((row) => row.side === side)
    .toSorted((a, b) => a.name.localeCompare(b.name))
    .map((row) => ({
      assists: row.assists,
      demolitions: row.demolitions,
      goals: row.goals,
      name: row.name,
      player: row.player
        ? { id: row.player.id, name: row.player.name, slug: row.player.slug }
        : null,
      saves: row.saves,
      shots: row.shots,
    })),
});

const toTournamentGame = (game: MatchGame): TournamentStatsGame => ({
  ballchasingId: game.ballchasingId,
  blueGoals: game.blueGoals,
  blueParticipantId: game.blueParticipant.id,
  matchId: game.match.id,
  number: game.number,
  orangeGoals: game.orangeGoals,
  orangeParticipantId: game.orangeParticipant.id,
  playedAt: game.playedAt?.toISOString() ?? null,
});

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
          teams: [nameOf(game.blueParticipant), nameOf(game.orangeParticipant)],
          tournamentName: game.match.tournament.name,
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
          { onConflictAction: "ignore", onConflictFields: ["platform", "platformId"] },
        );
        const kept = await em.findOneOrFail(PlayerPlatformLink, account, { refresh: true });
        await em.nativeUpdate(
          MatchGamePlayer,
          { ...account, player: null },
          { player: kept.player },
        );
      });

      const row = em.create(MatchGame, {
        ballchasingId: game.ballchasingId,
        blueGoals: game.blueGoals,
        blueParticipant: game.blueParticipantId,
        createdAt: new Date(),
        match: game.matchId,
        number: game.number,
        orangeGoals: game.orangeGoals,
        orangeParticipant: game.orangeParticipantId,
        playedAt: game.playedAt,
        rocketLeagueId: game.rocketLeagueId,
      });

      for (const player of game.players) {
        em.create(MatchGamePlayer, {
          assists: player.assists,
          demolitions: player.demolitions,
          game: row,
          goals: player.goals,
          name: player.name,
          platform: player.platform,
          platformId: player.platformId,
          player: player.playerId,
          saves: player.saves,
          shots: player.shots,
          side: player.side,
        });
      }

      return toTournamentGame(row);
    });
  }

  async byMatch(matchId: string): Promise<MatchGameStats[]> {
    const games = await this.em.find(
      MatchGame,
      { match: matchId },
      { orderBy: { number: "ASC" }, populate: ["players.player"] },
    );

    return games.map((game) => ({
      ballchasingId: game.ballchasingId,
      number: game.number,
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
        account: JSON.stringify([row.platform, row.platformId ?? row.name]),
        assists: row.assists,
        demolitions: row.demolitions,
        gameId: row.game.id,
        goals: row.goals,
        player: row.player
          ? { id: row.player.id, name: row.player.name, slug: row.player.slug }
          : null,
        saves: row.saves,
        shots: row.shots,
        team: {
          id: participant.team?.id ?? null,
          name: nameOf(participant),
          slug: participant.team?.slug ?? null,
        },
        teamGoals: row.side === "blue" ? row.game.blueGoals : row.game.orangeGoals,
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
        { onConflictAction: "ignore", onConflictFields: ["ballchasingId"] },
      );

      return removed;
    });
  }
}
