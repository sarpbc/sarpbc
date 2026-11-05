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
  teamName: string;
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

export type ReplayAssignment =
  | {
      kind: "matched";
      replay: ReplaySummary;
      matchId: string;
      gameNumber: number;
      sides: SideAssignment;
    }
  | { kind: "unmatched"; replay: ReplaySummary; reason: UnmatchedReason; matchId: string | null };

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
  const named = team.name !== null && teamNameMatches(team.name, participant.teamName);
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

  // Overlapping windows (a same-day rematch): the replay belongs to the latest match already started.
  const started = windowed
    .filter(({ begin }) => begin <= played + EARLY_START_MS)
    .sort((a, b) => b.begin - a.begin);
  if (started.length === 0 || (started.length > 1 && started[0].begin === started[1].begin))
    return { kind: "unmatched", reason: "ambiguous_match" };
  return { kind: "placed", matchId: started[0].matchId, sides: started[0].sides };
}

function seriesProblem(
  match: CandidateMatch,
  games: readonly { replay: ReplaySummary; sides: SideAssignment }[],
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
  return games.length < played ? "incomplete_series" : null;
}

function byPlayedAt(a: ReplaySummary, b: ReplaySummary): number {
  return (a.playedAt?.getTime() ?? 0) - (b.playedAt?.getTime() ?? 0) || a.id.localeCompare(b.id);
}

export function assignReplays(
  replays: readonly ReplaySummary[],
  matches: readonly CandidateMatch[],
): ReplayAssignment[] {
  const assignments: ReplayAssignment[] = [];
  const series = new Map<string, { replay: ReplaySummary; sides: SideAssignment }[]>();
  const seen = new Set<string>();

  for (const replay of [...replays].sort(byPlayedAt)) {
    if (replay.rocketLeagueId) {
      if (seen.has(replay.rocketLeagueId)) {
        assignments.push({ kind: "unmatched", replay, reason: "duplicate_replay", matchId: null });
        continue;
      }
      seen.add(replay.rocketLeagueId);
    }
    const placement = place(replay, matches);
    if (placement.kind === "unmatched") {
      assignments.push({ kind: "unmatched", replay, reason: placement.reason, matchId: null });
      continue;
    }
    const games = series.get(placement.matchId) ?? [];
    games.push({ replay, sides: placement.sides });
    series.set(placement.matchId, games);
  }

  for (const match of matches) {
    const games = series.get(match.id);
    if (!games) continue;
    const problem = seriesProblem(match, games);
    games.forEach(({ replay, sides }, index) =>
      assignments.push(
        problem
          ? { kind: "unmatched", replay, reason: problem, matchId: match.id }
          : { kind: "matched", replay, matchId: match.id, gameNumber: index + 1, sides },
      ),
    );
  }

  return assignments;
}

export function resolvePlayerId(
  inGameName: string,
  roster: readonly RosterPlayer[],
): string | null {
  const found = roster.filter((player) => playerNameMatches(inGameName, player.name));
  return found.length === 1 ? found[0].id : null;
}
