import { OPEN_ERA_START } from "@sarpbc/types";
import type {
  MatchGameStats,
  MatchGameTeamStats,
  StatsEra,
  TournamentStatsGame,
} from "@sarpbc/types";
import { EntityManager } from "@mikro-orm/postgresql";
import { z } from "zod";
import { mapSequentially } from "../../../common/application/sequentially";
import { TournamentParticipant } from "../../../tournament/infrastructure/competition-persistence";
import type { PlayerStatsSummary, StatsScope } from "../../domain/player-stats";
import type {
  GameAttachment,
  GameRecord,
  GameStatsStore,
  PlatformAccount,
} from "../../application/ports";
import type { GameLocation, Side } from "../../domain/replay-matching";
import { MatchGame } from "./match-game.entity";
import { MatchGameExclusion } from "./match-game-exclusion.entity";
import { MatchGamePlayer } from "./match-game-player.entity";
import { PlayerPlatformLink } from "./player-platform-link.entity";
import { nameOf } from "./participant-name";
import { toLink } from "./player-link.store";

const STATS_FROM = `from match_game_player p
  join match_game g on g.id = p.game_id
  join match m on m.id = g.match_id
  join tournament t on t.id = m.tournament_id
  join tournament_participant part on part.id =
    case when p.side = 'blue' then g.blue_participant_id else g.orange_participant_id end`;

const eraFilter = (era: StatsEra) => {
  const playedOn = "coalesce(g.played_at, m.begin_at, t.begin_at)";

  switch (era) {
    case "open": {
      return `${playedOn} >= ?`;
    }

    case "pre-open": {
      return `${playedOn} < ?`;
    }

    default: {
      const exhaustive: never = era;

      return exhaustive;
    }
  }
};

const scopeFilter = (scope: StatsScope) => {
  switch (scope.kind) {
    case "tournaments": {
      return {
        filter: `m.tournament_id in (${scope.ids.map(() => "?").join(", ")})`,
        minGames: 1,
        params: scope.ids,
      };
    }

    case "redistributable": {
      const redistributable = "t.source <> 'startgg'";

      return scope.era === null
        ? { filter: redistributable, minGames: scope.minGames, params: [] }
        : {
            filter: `${redistributable} and ${eraFilter(scope.era)}`,
            minGames: scope.minGames,
            params: [OPEN_ERA_START],
          };
    }

    default: {
      const exhaustive: never = scope;

      return exhaustive;
    }
  }
};

const count = z.coerce.number().int().nonnegative();

const summaryRows = z.array(z.object({ games: count, unlinked_accounts: count }));

const tallyRows = z.array(
  z.object({
    assists: count,
    demolitions: count,
    games: count,
    goals: count,
    lineup_id: z.string().nullable(),
    player_id: z.string(),
    player_name: z.string(),
    player_slug: z.string(),
    saves: count,
    shots: count,
    team_goals: count,
    team_id: z.string().nullable(),
    team_name: z.string().nullable(),
    team_slug: z.string().nullable(),
  }),
);

const toTeam = (game: MatchGame, side: Side) =>
  ({
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
  }) satisfies MatchGameTeamStats;

const toTournamentGame = (game: MatchGame) =>
  ({
    ballchasingId: game.ballchasingId,
    blueGoals: game.blueGoals,
    blueParticipantId: game.blueParticipant.id,
    matchId: game.match.id,
    number: game.number,
    orangeGoals: game.orangeGoals,
    orangeParticipantId: game.orangeParticipant.id,
    playedAt: game.playedAt?.toISOString() ?? null,
  }) satisfies TournamentStatsGame;

export class MikroOrmGameStatsStore implements GameStatsStore {
  constructor(private readonly em: EntityManager) {}

  async locations(replayIds: string[]) {
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

  async excluded(replayIds: string[]) {
    if (replayIds.length === 0) {
      return new Set<string>();
    }

    const rows = await this.em.findAll(MatchGameExclusion, {
      where: { ballchasingId: { $in: replayIds } },
    });

    return new Set(rows.map((row) => row.ballchasingId));
  }

  async attachment(replayId: string) {
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
      ? ({
          matchId: game.match.id,
          number: game.number,
          teams: [nameOf(game.blueParticipant), nameOf(game.orangeParticipant)],
          tournamentName: game.match.tournament.name,
        } satisfies GameAttachment)
      : null;
  }

  async links(accounts: PlatformAccount[]) {
    if (accounts.length === 0) {
      return [];
    }

    const rows = await this.em.findAll(PlayerPlatformLink, { where: { $or: accounts } });

    return rows.map(toLink);
  }

  async save(game: GameRecord) {
    return (await this.em.transactional(async (em) => {
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
    })) satisfies TournamentStatsGame;
  }

  async byMatch(matchId: string) {
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
    })) satisfies MatchGameStats[];
  }

  async inTournament(tournamentId: string) {
    const games = await this.em.find(
      MatchGame,
      { match: { tournament: tournamentId } },
      { orderBy: { number: "ASC" } },
    );

    return games.map(toTournamentGame) satisfies TournamentStatsGame[];
  }

  async playerStats(scope: StatsScope) {
    const { filter, minGames, params } = scopeFilter(scope);
    const connection = this.em.getConnection();

    const [summary] = summaryRows.parse(
      await connection.execute(
        `select count(distinct p.game_id) as games,
          count(distinct case when p.player_id is null
            then p.platform || ':' || coalesce(p.platform_id, p.name) end) as unlinked_accounts
        ${STATS_FROM} where ${filter}`,
        params,
      ),
    );

    const rows = tallyRows.parse(
      await connection.execute(
        `select pl.id as player_id, pl.name as player_name, pl.slug as player_slug,
          tm.id as team_id, tm.name as team_name, tm.slug as team_slug,
          case when tm.id is null then part.id end as lineup_id,
          count(distinct p.game_id) as games,
          sum(p.goals) as goals, sum(p.assists) as assists, sum(p.saves) as saves,
          sum(p.shots) as shots, sum(p.demolitions) as demolitions,
          sum(case when p.side = 'blue' then g.blue_goals else g.orange_goals end) as team_goals
        ${STATS_FROM}
        join player pl on pl.id = p.player_id
        left join team tm on tm.id = part.team_id
        where ${filter}
        group by pl.id, tm.id, lineup_id
        having count(distinct p.game_id) >= ?`,
        [...params, minGames],
      ),
    );

    const lineups = await this.lineupNames(
      rows.flatMap(({ lineup_id }) => (lineup_id === null ? [] : [lineup_id])),
    );

    return {
      games: summary?.games ?? 0,
      tallies: rows.map((row) => ({
        games: row.games,
        player: { id: row.player_id, name: row.player_name, slug: row.player_slug },
        team: {
          id: row.team_id,
          name: row.team_name ?? lineups.get(row.lineup_id ?? "") ?? "",
          slug: row.team_slug,
        },
        teamGoals: row.team_goals,
        totals: {
          assists: row.assists,
          demolitions: row.demolitions,
          goals: row.goals,
          saves: row.saves,
          shots: row.shots,
        },
      })),
      unlinkedAccounts: summary?.unlinked_accounts ?? 0,
    } satisfies PlayerStatsSummary;
  }

  private async lineupNames(ids: string[]) {
    const lineups =
      ids.length === 0
        ? []
        : await this.em.find(
            TournamentParticipant,
            { id: { $in: ids } },
            { populate: ["players", "team"] },
          );

    return new Map(lineups.map((participant) => [participant.id, nameOf(participant)]));
  }

  async remove(tournamentId: string, location: GameLocation) {
    return (await this.em.transactional(async (em) => {
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
    })) satisfies TournamentStatsGame | null;
  }
}
