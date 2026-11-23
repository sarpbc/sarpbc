import { IntegrationError } from "../../common/domain/errors/integration-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { resolvePlayerId } from "../domain/replay-matching";
import type { RosterPlayer, Side, SideAssignment } from "../domain/replay-matching";
import type {
  BallchasingSource,
  GameRecord,
  GameReplayRecord,
  PlayerLink,
  ReplayStats,
  StatsCandidates,
} from "./ports";

export interface GameTarget {
  matchId: string;
  number: number;
  sides: SideAssignment;
}

export interface ReplayTarget {
  ballchasingId: string;
  rocketLeagueId: string | null;
  playedAt: Date | null;
  sides: SideAssignment;
}

export interface ReplaySegment {
  target: ReplayTarget;
  stats: ReplayStats;
}

export const requireBallchasing = (source: BallchasingSource | null) => {
  if (!source) {
    throw new IntegrationError({
      code: "ballchasing_not_configured",
      message: "Ballchasing is not configured. Set BALLCHASING_API_KEY on the API and restart it.",
    });
  }

  return source;
};

export const requireTournament = async (candidates: StatsCandidates, tournamentId: string) => {
  if (!(await candidates.tournamentExists(tournamentId))) {
    throw new NotFoundError("This tournament no longer exists. Reload the tournament list.");
  }
};

export const hasBothTeams = (stats: ReplayStats) =>
  (["blue", "orange"] as const).every((side) =>
    stats.players.some((player) => player.side === side),
  );

export const platformAccounts = (stats: ReplayStats) =>
  stats.players.flatMap(({ platform, platformId }) =>
    platformId !== null && platformId !== "" ? [{ platform, platformId }] : [],
  );

const opposite = (side: Side) => {
  switch (side) {
    case "blue": {
      return "orange" satisfies Side;
    }

    case "orange": {
      return "blue" satisfies Side;
    }

    default: {
      const exhaustive: never = side;

      return exhaustive;
    }
  }
};

export const buildReplayRecord = (
  { target: { sides, ...target }, stats }: ReplaySegment,
  gameSides: SideAssignment,
  rosters: ReadonlyMap<string, RosterPlayer[]>,
  links: PlayerLink[],
) => {
  const swapped = sides.blue !== gameSides.blue;
  const learnedLinks: PlayerLink[] = [];

  const players = stats.players.map((player) => {
    const side = swapped ? opposite(player.side) : player.side;
    const { platform, platformId } = player;

    const linked = links.find(
      (link) => link.platform === platform && link.platformId === platformId,
    );

    if (linked) {
      return { ...player, playerId: linked.playerId, side };
    }

    const playerId = resolvePlayerId(player.name, rosters.get(gameSides[side]) ?? []);

    if (playerId !== null && playerId !== "" && platformId !== null && platformId !== "") {
      learnedLinks.push({ platform, platformId, playerId });
    }

    return { ...player, playerId, side };
  });

  return {
    learnedLinks,
    replay: {
      ...target,
      blueGoals: swapped ? stats.orangeGoals : stats.blueGoals,
      orangeGoals: swapped ? stats.blueGoals : stats.orangeGoals,
      players,
    } satisfies GameReplayRecord,
  };
};

export const buildGameRecord = (
  { sides, ...target }: GameTarget,
  segments: readonly ReplaySegment[],
  rosters: ReadonlyMap<string, RosterPlayer[]>,
  links: PlayerLink[],
) => {
  const built = segments.map((segment) => buildReplayRecord(segment, sides, rosters, links));

  const learnedLinks = built
    .flatMap((replay) => replay.learnedLinks)
    .filter(
      (link, index, all) =>
        all.findIndex(
          (other) => other.platform === link.platform && other.platformId === link.platformId,
        ) === index,
    );

  return {
    ...target,
    blueParticipantId: sides.blue,
    learnedLinks,
    orangeParticipantId: sides.orange,
    replays: built.map(({ replay }) => replay),
  } satisfies GameRecord;
};
