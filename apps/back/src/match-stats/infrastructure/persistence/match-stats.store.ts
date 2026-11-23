import { OPEN_ERA_START } from "@sarpbc/types";
import type {
  MatchGamePlayerStats,
  MatchGameStats,
  MatchGameTeamStats,
  StatsEra,
  TournamentStatsGame,
} from "@sarpbc/types";
import { EntityManager } from "@mikro-orm/postgresql";
import { z } from "zod";
import { mapSequentially } from "../../../common/application/sequentially";
import { TournamentParticipant } from "../../../tournament/infrastructure/competition-persistence";
import type { PlayerStatsSummary, StatsMinGames, StatsScope } from "../../domain/player-stats";
import type {
  GameAttachment,
  GameRecord,
  GameReplayRecord,
  GameStatsStore,
  PlatformAccount,
  PlayerLink,
  ReplayAppend,
} from "../../application/ports";
import type { GameLocation, Side } from "../../domain/replay-matching";
import { MatchGame } from "./match-game.entity";
import { MatchGameExclusion } from "./match-game-exclusion.entity";
import { MatchGamePlayer } from "./match-game-player.entity";
import { MatchGameReplay } from "./match-game-replay.entity";
import { PlayerPlatformLink } from "./player-platform-link.entity";
import { nameOf } from "./participant-name";
import { toLink } from "./player-link.store";

const STATS_FROM = `from match_game_player p
  join match_game_replay r on r.id = p.replay_id
  join match_game g on g.id = r.game_id
  join match m on m.id = g.match_id
  join tournament t on t.id = m.tournament_id
  join tournament_participant part on part.id =
    case when p.side = 'blue' then g.blue_participant_id else g.orange_participant_id end`;

const PLAYED_ON = "coalesce(r.played_at, m.begin_at, t.begin_at)";

const eraFilter = (era: StatsEra) => {
  switch (era) {
    case "open": {
      return `${PLAYED_ON} >= ?`;
    }

    case "pre-open": {
      return `${PLAYED_ON} < ?`;
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
        minGames: { count: 1, per: "team" as const },
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

const regularPlayers = (
  filter: string,
  params: readonly string[],
  { count: minGames, per }: StatsMinGames,
) => {
  switch (per) {
    case "player": {
      return {
        having: "",
        params: [...params, ...params, minGames],
        where: `${filter} and p.player_id in (select p.player_id ${STATS_FROM} where ${filter}
          group by p.player_id having count(distinct r.game_id) >= ?)`,
      };
    }

    case "team": {
      return {
        having: "having count(distinct r.game_id) >= ?",
        params: [...params, minGames],
        where: filter,
      };
    }

    default: {
      const exhaustive: never = per;

      return exhaustive;
    }
  }
};

const count = z.coerce.number().int().nonnegative();

const summaryRows = z.array(z.object({ games: count, unlinked_accounts: count }));

const tallyRows = z.array(
  z.object({
    assists: count,
    current_team_dark_mode_image_url: z.string().nullable(),
    current_team_image_url: z.string().nullable(),
    current_team_logo_dark_url: z.string().nullable(),
    current_team_logo_light_url: z.string().nullable(),
    current_team_name: z.string().nullable(),
    current_team_slug: z.string().nullable(),
    demolitions: count,
    games: count,
    goals: count,
    last_played_at: z.coerce.date().nullable(),
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

const STAT_KEYS = ["goals", "assists", "saves", "shots", "demolitions"] as const;

type ReplayScore = Pick<
  MatchGameReplay,
  "ballchasingId" | "playedAt" | "blueGoals" | "orangeGoals"
>;

const replaysOf = (game: MatchGame) =>
  game.replays.getItems().toSorted((a, b) => a.position - b.position);

const goalsOf = (replays: readonly ReplayScore[], side: Side) =>
  replays.reduce(
    (sum, replay) => sum + (side === "blue" ? replay.blueGoals : replay.orangeGoals),
    0,
  );

const teamPlayers = (replays: readonly MatchGameReplay[], side: Side) => {
  const players = new Map<string, MatchGamePlayerStats>();

  for (const row of replays.flatMap((replay) => replay.players.getItems())) {
    if (row.side !== side) {
      continue;
    }

    const key = JSON.stringify([row.platform, row.platformId ?? row.name]);
    const known = players.get(key);

    if (known) {
      for (const stat of STAT_KEYS) {
        known[stat] += row[stat];
      }

      continue;
    }

    players.set(key, {
      assists: row.assists,
      demolitions: row.demolitions,
      goals: row.goals,
      name: row.name,
      player: row.player
        ? { id: row.player.id, name: row.player.name, slug: row.player.slug }
        : null,
      saves: row.saves,
      shots: row.shots,
    });
  }

  return [...players.values()].toSorted((a, b) => a.name.localeCompare(b.name));
};

const toTeam = (game: MatchGame, replays: readonly MatchGameReplay[], side: Side) =>
  ({
    goals: goalsOf(replays, side),
    participantId: (side === "blue" ? game.blueParticipant : game.orangeParticipant).id,
    players: teamPlayers(replays, side),
  }) satisfies MatchGameTeamStats;

type GameKey = Pick<
  TournamentStatsGame,
  "matchId" | "number" | "blueParticipantId" | "orangeParticipantId"
>;

const summarize = (
  { matchId, number, blueParticipantId, orangeParticipantId }: GameKey,
  replays: readonly ReplayScore[],
) =>
  ({
    blueGoals: goalsOf(replays, "blue"),
    blueParticipantId,
    matchId,
    number,
    orangeGoals: goalsOf(replays, "orange"),
    orangeParticipantId,
    playedAt: replays.at(0)?.playedAt?.toISOString() ?? null,
    replays: replays.map((replay) => ({
      ballchasingId: replay.ballchasingId,
      blueGoals: replay.blueGoals,
      orangeGoals: replay.orangeGoals,
      playedAt: replay.playedAt?.toISOString() ?? null,
    })),
  }) satisfies TournamentStatsGame;

const keyOf = (game: MatchGame) =>
  ({
    blueParticipantId: game.blueParticipant.id,
    matchId: game.match.id,
    number: game.number,
    orangeParticipantId: game.orangeParticipant.id,
  }) satisfies GameKey;

const toTournamentGame = (game: MatchGame) => summarize(keyOf(game), replaysOf(game));

const learn = async (em: EntityManager, links: readonly PlayerLink[]) => {
  await mapSequentially(links, async ({ playerId, ...account }) => {
    await em.upsert(
      PlayerPlatformLink,
      { ...account, player: playerId },
      { onConflictAction: "ignore", onConflictFields: ["platform", "platformId"] },
    );
    const kept = await em.findOneOrFail(PlayerPlatformLink, account, { refresh: true });
    await em.nativeUpdate(MatchGamePlayer, { ...account, player: null }, { player: kept.player });
  });
};

const createReplay = (
  em: EntityManager,
  game: MatchGame,
  position: number,
  { players, ...replay }: GameReplayRecord,
) => {
  const row = em.create(MatchGameReplay, { ...replay, game, position });

  for (const player of players) {
    em.create(MatchGamePlayer, {
      assists: player.assists,
      demolitions: player.demolitions,
      goals: player.goals,
      name: player.name,
      platform: player.platform,
      platformId: player.platformId,
      player: player.playerId,
      replay: row,
      saves: player.saves,
      shots: player.shots,
      side: player.side,
    });
  }
};

const findGame = async (em: EntityManager, tournamentId: string, location: GameLocation) =>
  await em.findOne(
    MatchGame,
    { match: { id: location.matchId, tournament: tournamentId }, number: location.number },
    { populate: ["replays"] },
  );

const exclude = async (em: EntityManager, ballchasingIds: readonly string[]) => {
  await em.upsertMany(
    MatchGameExclusion,
    ballchasingIds.map((ballchasingId) => ({ ballchasingId })),
    { onConflictAction: "ignore", onConflictFields: ["ballchasingId"] },
  );
};

export class MikroOrmGameStatsStore implements GameStatsStore {
  constructor(private readonly em: EntityManager) {}

  async locations(replayIds: string[]) {
    if (replayIds.length === 0) {
      return new Map();
    }

    const rows = await this.em.find(
      MatchGameReplay,
      { ballchasingId: { $in: replayIds } },
      { populate: ["game"] },
    );

    return new Map(
      rows.map((row) => [
        row.ballchasingId,
        { matchId: row.game.match.id, number: row.game.number } satisfies GameLocation,
      ]),
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
    const replay = await this.em.findOne(
      MatchGameReplay,
      { ballchasingId: replayId },
      {
        populate: [
          "game.match.tournament",
          "game.blueParticipant.team",
          "game.blueParticipant.players",
          "game.orangeParticipant.team",
          "game.orangeParticipant.players",
        ],
      },
    );

    const game = replay?.game;

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
      await em.nativeDelete(MatchGameExclusion, {
        ballchasingId: { $in: game.replays.map((replay) => replay.ballchasingId) },
      });
      await learn(em, game.learnedLinks);

      const row = em.create(MatchGame, {
        blueParticipant: game.blueParticipantId,
        createdAt: new Date(),
        match: game.matchId,
        number: game.number,
        orangeParticipant: game.orangeParticipantId,
      });

      for (const [index, replay] of game.replays.entries()) {
        createReplay(em, row, index + 1, replay);
      }

      return summarize(game, game.replays);
    })) satisfies TournamentStatsGame;
  }

  async appendReplay(
    tournamentId: string,
    location: GameLocation,
    { replay, learnedLinks }: ReplayAppend,
  ) {
    return (await this.em.transactional(async (em) => {
      const game = await findGame(em, tournamentId, location);

      if (!game) {
        return null;
      }

      await em.nativeDelete(MatchGameExclusion, { ballchasingId: replay.ballchasingId });
      await learn(em, learnedLinks);

      const replays = replaysOf(game);
      createReplay(em, game, (replays.at(-1)?.position ?? 0) + 1, replay);

      return summarize(keyOf(game), [...replays, replay]);
    })) satisfies TournamentStatsGame | null;
  }

  async game(tournamentId: string, location: GameLocation) {
    const game = await findGame(this.em, tournamentId, location);

    return game ? toTournamentGame(game) : null;
  }

  async byMatch(matchId: string) {
    const games = await this.em.find(
      MatchGame,
      { match: matchId },
      { orderBy: { number: "ASC" }, populate: ["replays.players.player"] },
    );

    return games.map((game) => {
      const replays = replaysOf(game);

      return {
        ballchasingIds: replays.map((replay) => replay.ballchasingId),
        number: game.number,
        playedAt: replays.at(0)?.playedAt?.toISOString() ?? null,
        teams: [toTeam(game, replays, "blue"), toTeam(game, replays, "orange")],
      };
    }) satisfies MatchGameStats[];
  }

  async inTournament(tournamentId: string) {
    const games = await this.em.find(
      MatchGame,
      { match: { tournament: tournamentId } },
      { orderBy: { number: "ASC" }, populate: ["replays"] },
    );

    return games.map(toTournamentGame) satisfies TournamentStatsGame[];
  }

  async playerStats(scope: StatsScope) {
    const { filter, minGames, params } = scopeFilter(scope);
    const connection = this.em.getConnection();

    const [summary] = summaryRows.parse(
      await connection.execute(
        `select count(distinct r.game_id) as games,
          count(distinct case when p.player_id is null
            then p.platform || ':' || coalesce(p.platform_id, p.name) end) as unlinked_accounts
        ${STATS_FROM} where ${filter}`,
        params,
      ),
    );

    const regular = regularPlayers(filter, params, minGames);

    const rows = tallyRows.parse(
      await connection.execute(
        `select pl.id as player_id, pl.name as player_name, pl.slug as player_slug,
          tm.id as team_id, tm.name as team_name, tm.slug as team_slug,
          ct.name as current_team_name, ct.slug as current_team_slug,
          ct.image_url as current_team_image_url,
          ct.dark_mode_image_url as current_team_dark_mode_image_url,
          ct.logo_light_url as current_team_logo_light_url,
          ct.logo_dark_url as current_team_logo_dark_url,
          case when tm.id is null then part.id end as lineup_id,
          count(distinct r.game_id) as games,
          sum(p.goals) as goals, sum(p.assists) as assists, sum(p.saves) as saves,
          sum(p.shots) as shots, sum(p.demolitions) as demolitions,
          sum(case when p.side = 'blue' then r.blue_goals else r.orange_goals end) as team_goals,
          max(${PLAYED_ON}) as last_played_at
        ${STATS_FROM}
        join player pl on pl.id = p.player_id
        left join team tm on tm.id = part.team_id
        left join team ct on ct.id = pl.team_id
        where ${regular.where}
        group by pl.id, tm.id, ct.id, lineup_id
        ${regular.having}`,
        regular.params,
      ),
    );

    const lineups = await this.lineupNames(
      rows.flatMap(({ lineup_id }) => (lineup_id === null ? [] : [lineup_id])),
    );

    return {
      games: summary?.games ?? 0,
      tallies: rows.map((row) => ({
        games: row.games,
        lastPlayedAt: row.last_played_at,
        player: {
          currentTeam:
            row.current_team_name === null || row.current_team_slug === null
              ? null
              : {
                  darkModeImageUrl: row.current_team_dark_mode_image_url,
                  imageUrl: row.current_team_image_url,
                  logoDarkUrl: row.current_team_logo_dark_url,
                  logoLightUrl: row.current_team_logo_light_url,
                  name: row.current_team_name,
                  slug: row.current_team_slug,
                },
          id: row.player_id,
          name: row.player_name,
          slug: row.player_slug,
        },
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
      const game = await findGame(em, tournamentId, location);

      if (!game) {
        return null;
      }

      const removed = toTournamentGame(game);
      await em.nativeDelete(MatchGame, { id: game.id });
      await exclude(
        em,
        removed.replays.map((replay) => replay.ballchasingId),
      );

      return removed;
    })) satisfies TournamentStatsGame | null;
  }

  async removeReplay(tournamentId: string, location: GameLocation, replayId: string) {
    return (await this.em.transactional(async (em) => {
      const game = await findGame(em, tournamentId, location);
      const replays = game ? replaysOf(game) : [];
      const replay = replays.find((candidate) => candidate.ballchasingId === replayId);

      if (!game || !replay) {
        return null;
      }

      await em.nativeDelete(MatchGameReplay, { id: replay.id });
      await exclude(em, [replayId]);

      return summarize(
        keyOf(game),
        replays.filter((kept) => kept !== replay),
      );
    })) satisfies TournamentStatsGame | null;
  }
}
