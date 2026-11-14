import type { StatsImportUnmatchedReason as UnmatchedReason } from "@sarpbc/types";
import { playerNameMatches, teamNameMatches } from "./names";

export type Side = "blue" | "orange";

export interface ReplayTeam {
  name: string | null;
  goals: number;
  playerNames: string[];
}

export interface ReplaySummary {
  id: string;
  rocketLeagueId: string | null;
  title: string;
  playedAt: Date | null;
  /** Ballchasing keeps the uploader's local time when the replay carries no timezone. */
  playedAtHasTimezone: boolean;
  blue: ReplayTeam;
  orange: ReplayTeam;
}

export interface RosterPlayer {
  id: string;
  name: string;
}

export interface CandidateParticipant {
  id: string;
  teamNames: string[];
  players: RosterPlayer[];
}

export interface CandidateMatch {
  id: string;
  beginAt: Date | null;
  endAt: Date | null;
  finished: boolean;
  numberOfGames: number | null;
  participants: CandidateParticipant[];
  /** Series score by participant id; empty when the match has no recorded result. */
  scores: Map<string, number>;
  storedReplayIds: string[];
}

export interface SideAssignment {
  blue: string;
  orange: string;
}

export interface GameLocation {
  matchId: string;
  number: number;
}

export type ReplayAssignment =
  | {
      kind: "matched";
      replay: ReplaySummary;
      matchId: string;
      gameNumber: number;
      sides: SideAssignment;
    }
  | { kind: "stored"; replay: ReplaySummary; matchId: string; gameNumber: number }
  | {
      kind: "unmatched";
      replay: ReplaySummary;
      reason: UnmatchedReason;
      matchId: string | null;
      sides: SideAssignment | null;
    };

const HOUR_MS = 3_600_000;
const EARLY_START_MS = HOUR_MS;
const LATE_END_MS = HOUR_MS;
const OPEN_MATCH_DURATION_MS = 6 * HOUR_MS;
const UNKNOWN_TIMEZONE_MS = 14 * HOUR_MS;

function majority(size: number): number {
  return Math.floor(size / 2) + 1;
}

function rosterOverlap(team: ReplayTeam, participant: CandidateParticipant): number {
  return team.playerNames.filter((name) =>
    participant.players.some((player) => playerNameMatches(name, player.name)),
  ).length;
}

function rosterIdentifies(team: ReplayTeam, participant: CandidateParticipant): boolean {
  return (
    team.playerNames.length > 0 &&
    rosterOverlap(team, participant) >= majority(team.playerNames.length)
  );
}

function identifies(team: ReplayTeam, participant: CandidateParticipant): boolean {
  if (rosterIdentifies(team, participant)) return true;
  const replayName = team.name;

  const named =
    replayName !== null &&
    participant.teamNames.some((teamName) => teamNameMatches(replayName, teamName));

  return named && (rosterOverlap(team, participant) >= 1 || participant.players.length === 0);
}

function orient(replay: ReplaySummary, match: CandidateMatch): SideAssignment | "ambiguous" | null {
  if (match.participants.length !== 2) return null;
  const [first, second] = match.participants;

  const fits = (blue: CandidateParticipant, orange: CandidateParticipant) =>
    identifies(replay.blue, blue) &&
    identifies(replay.orange, orange) &&
    !rosterIdentifies(replay.blue, orange) &&
    !rosterIdentifies(replay.orange, blue);

  const straight = fits(first, second);
  const swapped = fits(second, first);

  if (straight && swapped) return "ambiguous";

  if (straight) return { blue: first.id, orange: second.id };

  if (swapped) return { blue: second.id, orange: first.id };

  return null;
}

function windowContains(
  replay: ReplaySummary,
  played: number,
  begin: number,
  end: number | null,
): boolean {
  const slack = replay.playedAtHasTimezone ? 0 : UNKNOWN_TIMEZONE_MS;

  return (
    played >= begin - EARLY_START_MS - slack &&
    played <= (end ?? begin + OPEN_MATCH_DURATION_MS) + LATE_END_MS + slack
  );
}

type Placement =
  | { kind: "placed"; matchId: string; sides: SideAssignment }
  | { kind: "unmatched"; reason: UnmatchedReason };

function place(replay: ReplaySummary, matches: readonly CandidateMatch[]): Placement {
  const compatible: { match: CandidateMatch; sides: SideAssignment }[] = [];

  for (const match of matches) {
    const sides = orient(replay, match);

    if (sides === "ambiguous") return { kind: "unmatched", reason: "ambiguous_match" };

    if (sides) compatible.push({ match, sides });
  }

  if (compatible.length === 0) return { kind: "unmatched", reason: "unknown_teams" };

  if (!replay.playedAt) return { kind: "unmatched", reason: "missing_date" };
  const played = replay.playedAt.getTime();

  const windowed = compatible.flatMap(({ match, sides }) =>
    match.beginAt &&
    windowContains(replay, played, match.beginAt.getTime(), match.endAt?.getTime() ?? null)
      ? [{ matchId: match.id, sides, begin: match.beginAt.getTime() }]
      : [],
  );

  if (windowed.length === 0) return { kind: "unmatched", reason: "outside_match_window" };

  if (windowed.length === 1)
    return { kind: "placed", matchId: windowed[0].matchId, sides: windowed[0].sides };

  if (!replay.playedAtHasTimezone) return { kind: "unmatched", reason: "ambiguous_match" };

  // Overlapping windows (a same-day rematch): the replay belongs to the latest match already begun.
  // Every windowed match qualifies for the early-start slack, so when none has begun it cannot decide.
  const started = windowed
    .filter(({ begin }) => begin <= played)
    .toSorted((a, b) => b.begin - a.begin);

  if (started.length === 0 || (started.length > 1 && started[0].begin === started[1].begin))
    return { kind: "unmatched", reason: "ambiguous_match" };

  return { kind: "placed", matchId: started[0].matchId, sides: started[0].sides };
}

interface SeriesGame {
  replay: ReplaySummary;
  sides: SideAssignment;
  storedNumber: number | null;
}

function seriesProblem(
  match: CandidateMatch,
  games: readonly SeriesGame[],
): UnmatchedReason | null {
  if (match.storedReplayIds.some((id) => !games.some((game) => game.replay.id === id)))
    return "match_has_other_stats";

  if (match.numberOfGames !== null && games.length > match.numberOfGames)
    return "inconsistent_series";
  const wins = new Map<string, number>();

  for (const { replay, sides } of games) {
    if (replay.blue.goals === replay.orange.goals) return "inconsistent_series";
    const winner = replay.blue.goals > replay.orange.goals ? sides.blue : sides.orange;
    wins.set(winner, (wins.get(winner) ?? 0) + 1);
  }

  const played = [...match.scores.values()].reduce((sum, score) => sum + score, 0);

  if (!match.finished || played === 0) return "match_not_finished";

  for (const [participantId, won] of wins)
    if (won > (match.scores.get(participantId) ?? 0)) return "inconsistent_series";

  if (games.length < played) return "incomplete_series";

  // Staff may have attached a game under another number, and the import never renumbers one.
  if (games.some((game, index) => game.storedNumber !== null && game.storedNumber !== index + 1))
    return "match_has_other_stats";

  return null;
}

export function byPlayedAt(a: ReplaySummary, b: ReplaySummary): number {
  return (a.playedAt?.getTime() ?? 0) - (b.playedAt?.getTime() ?? 0) || a.id.localeCompare(b.id);
}

function seriesAssignments(
  matches: readonly CandidateMatch[],
  series: ReadonlyMap<string, readonly SeriesGame[]>,
): ReplayAssignment[] {
  const assignments: ReplayAssignment[] = [];

  for (const match of matches) {
    const games = series.get(match.id);

    if (!games) continue;
    const problem = seriesProblem(match, games);

    for (const [index, { replay, sides, storedNumber }] of games.entries()) {
      if (storedNumber !== null) continue;
      assignments.push(
        problem
          ? { kind: "unmatched", replay, reason: problem, matchId: match.id, sides }
          : { kind: "matched", replay, matchId: match.id, gameNumber: index + 1, sides },
      );
    }
  }

  return assignments;
}

/**
 * `stored` locates replays already saved, in any match; they are reported where they are and never
 * fetched, moved or renumbered. `excluded` holds replays staff removed; they count as absent.
 */
export function assignReplays(
  replays: readonly ReplaySummary[],
  matches: readonly CandidateMatch[],
  stored: ReadonlyMap<string, GameLocation> = new Map(),
  excluded: ReadonlySet<string> = new Set(),
): ReplayAssignment[] {
  const assignments: ReplayAssignment[] = [];
  const series = new Map<string, SeriesGame[]>();

  // Another upload of a stored or removed game must not come back under a new replay id.
  const taken = new Set(
    replays.flatMap((replay) =>
      replay.rocketLeagueId !== null &&
      replay.rocketLeagueId !== "" &&
      (stored.has(replay.id) || excluded.has(replay.id))
        ? [replay.rocketLeagueId]
        : [],
    ),
  );

  const seen = new Set<string>();

  for (const replay of replays.toSorted(byPlayedAt)) {
    if (excluded.has(replay.id)) {
      assignments.push({
        kind: "unmatched",
        replay,
        reason: "excluded_by_staff",
        matchId: null,
        sides: null,
      });
      continue;
    }

    const location = stored.get(replay.id);

    if (location) {
      assignments.push({
        kind: "stored",
        replay,
        matchId: location.matchId,
        gameNumber: location.number,
      });
    } else if (replay.rocketLeagueId !== null && replay.rocketLeagueId !== "") {
      if (seen.has(replay.rocketLeagueId) || taken.has(replay.rocketLeagueId)) {
        assignments.push({
          kind: "unmatched",
          replay,
          reason: "duplicate_replay",
          matchId: null,
          sides: null,
        });
        continue;
      }

      seen.add(replay.rocketLeagueId);
    }

    const placement = place(replay, matches);

    if (placement.kind === "unmatched") {
      if (!location)
        assignments.push({
          kind: "unmatched",
          replay,
          reason: placement.reason,
          matchId: null,
          sides: null,
        });
      continue;
    }

    // A game staff attached to another match is absent from the series it would fit.
    if (location && location.matchId !== placement.matchId) continue;
    const games = series.get(placement.matchId) ?? [];
    games.push({ replay, sides: placement.sides, storedNumber: location?.number ?? null });
    series.set(placement.matchId, games);
  }

  return [...assignments, ...seriesAssignments(matches, series)];
}

export function resolvePlayerId(
  inGameName: string,
  roster: readonly RosterPlayer[],
): string | null {
  const found = roster.filter((player) => playerNameMatches(inGameName, player.name));

  return found.length === 1 ? found[0].id : null;
}
