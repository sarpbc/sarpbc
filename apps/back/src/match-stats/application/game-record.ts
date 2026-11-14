import { IntegrationError, NotFoundError } from "../../common/domain/errors";
import { resolvePlayerId, type RosterPlayer, type SideAssignment } from "../domain/replay-matching";
import type {
  BallchasingSource,
  GameRecord,
  PlatformAccount,
  PlayerLink,
  ReplayStats,
  StatsCandidates,
} from "./ports";

export interface GameTarget {
  matchId: string;
  number: number;
  ballchasingId: string;
  rocketLeagueId: string | null;
  playedAt: Date | null;
  sides: SideAssignment;
}

export function requireBallchasing(source: BallchasingSource | null): BallchasingSource {
  if (!source)
    throw new IntegrationError({
      message: "Ballchasing is not configured. Set BALLCHASING_API_KEY on the API and restart it.",
      code: "ballchasing_not_configured",
    });

  return source;
}

export async function requireTournament(
  candidates: StatsCandidates,
  tournamentId: string,
): Promise<void> {
  if (!(await candidates.tournamentExists(tournamentId)))
    throw new NotFoundError("This tournament no longer exists. Reload the tournament list.");
}

export function hasBothTeams(stats: ReplayStats): boolean {
  return (["blue", "orange"] as const).every((side) =>
    stats.players.some((player) => player.side === side),
  );
}

export function platformAccounts(stats: ReplayStats): PlatformAccount[] {
  return stats.players.flatMap(({ platform, platformId }) =>
    platformId ? [{ platform, platformId }] : [],
  );
}

export function buildGameRecord(
  { sides, ...target }: GameTarget,
  stats: ReplayStats,
  rosters: ReadonlyMap<string, RosterPlayer[]>,
  links: PlayerLink[],
): GameRecord {
  const learnedLinks: PlayerLink[] = [];

  const players = stats.players.map((player) => {
    const { platform, platformId } = player;

    const linked = links.find(
      (link) => link.platform === platform && link.platformId === platformId,
    );

    if (linked) return { ...player, playerId: linked.playerId };
    const playerId = resolvePlayerId(player.name, rosters.get(sides[player.side]) ?? []);

    if (playerId && platformId) learnedLinks.push({ platform, platformId, playerId });

    return { ...player, playerId };
  });

  return {
    ...target,
    blueParticipantId: sides.blue,
    orangeParticipantId: sides.orange,
    blueGoals: stats.blueGoals,
    orangeGoals: stats.orangeGoals,
    players,
    learnedLinks,
  };
}
