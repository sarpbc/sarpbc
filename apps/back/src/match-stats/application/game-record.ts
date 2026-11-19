import { IntegrationError } from "../../common/domain/errors/integration-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { resolvePlayerId } from "../domain/replay-matching";
import type { RosterPlayer, SideAssignment } from "../domain/replay-matching";
import type { BallchasingSource, PlayerLink, ReplayStats, StatsCandidates } from "./ports";

export interface GameTarget {
  matchId: string;
  number: number;
  ballchasingId: string;
  rocketLeagueId: string | null;
  playedAt: Date | null;
  sides: SideAssignment;
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

export const buildGameRecord = (
  { sides, ...target }: GameTarget,
  stats: ReplayStats,
  rosters: ReadonlyMap<string, RosterPlayer[]>,
  links: PlayerLink[],
) => {
  const learnedLinks: PlayerLink[] = [];

  const players = stats.players.map((player) => {
    const { platform, platformId } = player;

    const linked = links.find(
      (link) => link.platform === platform && link.platformId === platformId,
    );

    if (linked) {
      return { ...player, playerId: linked.playerId };
    }

    const playerId = resolvePlayerId(player.name, rosters.get(sides[player.side]) ?? []);

    if (playerId !== null && playerId !== "" && platformId !== null && platformId !== "") {
      learnedLinks.push({ platform, platformId, playerId });
    }

    return { ...player, playerId };
  });

  return {
    ...target,
    blueGoals: stats.blueGoals,
    blueParticipantId: sides.blue,
    learnedLinks,
    orangeGoals: stats.orangeGoals,
    orangeParticipantId: sides.orange,
    players,
  };
};
