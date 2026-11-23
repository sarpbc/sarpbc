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

export interface GameSegment {
  replay: ReplaySummary;
  sides: SideAssignment;
}

export type ReplayAssignment =
  | {
      kind: "matched";
      matchId: string;
      gameNumber: number;
      segments: GameSegment[];
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

const majority = (size: number) => Math.floor(size / 2) + 1;

const rosterOverlap = (team: ReplayTeam, participant: CandidateParticipant) =>
  team.playerNames.filter((name) =>
    participant.players.some((player) => playerNameMatches(name, player.name)),
  ).length;

const rosterIdentifies = (team: ReplayTeam, participant: CandidateParticipant) =>
  team.playerNames.length > 0 &&
  rosterOverlap(team, participant) >= majority(team.playerNames.length);

const identifies = (team: ReplayTeam, participant: CandidateParticipant) => {
  if (rosterIdentifies(team, participant)) {
    return true;
  }

  const replayName = team.name;

  const named =
    replayName !== null &&
    participant.teamNames.some((teamName) => teamNameMatches(replayName, teamName));

  return named && (rosterOverlap(team, participant) >= 1 || participant.players.length === 0);
};

const orient = (replay: ReplaySummary, match: CandidateMatch) => {
  if (match.participants.length !== 2) {
    return null;
  }

  const [first, second] = match.participants;

  const fits = (blue: CandidateParticipant, orange: CandidateParticipant) =>
    identifies(replay.blue, blue) &&
    identifies(replay.orange, orange) &&
    !rosterIdentifies(replay.blue, orange) &&
    !rosterIdentifies(replay.orange, blue);

  const straight = fits(first, second);
  const swapped = fits(second, first);

  if (straight && swapped) {
    return "ambiguous";
  }

  if (straight) {
    return { blue: first.id, orange: second.id };
  }

  if (swapped) {
    return { blue: second.id, orange: first.id };
  }

  return null;
};

const windowContains = (
  replay: ReplaySummary,
  played: number,
  begin: number,
  end: number | null,
) => {
  const slack = replay.playedAtHasTimezone ? 0 : UNKNOWN_TIMEZONE_MS;

  return (
    played >= begin - EARLY_START_MS - slack &&
    played <= (end ?? begin + OPEN_MATCH_DURATION_MS) + LATE_END_MS + slack
  );
};

type Placement =
  | { kind: "placed"; matchId: string; sides: SideAssignment }
  | { kind: "unmatched"; reason: UnmatchedReason };

const place = ((replay, matches) => {
  const compatible: { match: CandidateMatch; sides: SideAssignment }[] = [];

  for (const match of matches) {
    const sides = orient(replay, match);

    if (sides === "ambiguous") {
      return { kind: "unmatched", reason: "ambiguous_match" };
    }

    if (sides) {
      compatible.push({ match, sides });
    }
  }

  if (compatible.length === 0) {
    return { kind: "unmatched", reason: "unknown_teams" };
  }

  if (!replay.playedAt) {
    return { kind: "unmatched", reason: "missing_date" };
  }

  const played = replay.playedAt.getTime();

  const windowed = compatible.flatMap(({ match, sides }) =>
    match.beginAt &&
    windowContains(replay, played, match.beginAt.getTime(), match.endAt?.getTime() ?? null)
      ? [{ begin: match.beginAt.getTime(), matchId: match.id, sides }]
      : [],
  );

  if (windowed.length === 0) {
    return { kind: "unmatched", reason: "outside_match_window" };
  }

  if (windowed.length === 1) {
    return { kind: "placed", matchId: windowed[0].matchId, sides: windowed[0].sides };
  }

  if (!replay.playedAtHasTimezone) {
    return { kind: "unmatched", reason: "ambiguous_match" };
  }

  const started = windowed
    .filter(({ begin }) => begin <= played)
    .toSorted((a, b) => b.begin - a.begin);

  if (started.length === 0 || (started.length > 1 && started[0].begin === started[1].begin)) {
    return { kind: "unmatched", reason: "ambiguous_match" };
  }

  return { kind: "placed", matchId: started[0].matchId, sides: started[0].sides };
}) satisfies (replay: ReplaySummary, matches: readonly CandidateMatch[]) => Placement;

export const byPlayedAt = (a: ReplaySummary, b: ReplaySummary) =>
  (a.playedAt?.getTime() ?? 0) - (b.playedAt?.getTime() ?? 0) || a.id.localeCompare(b.id);

interface PlacedReplay extends GameSegment {
  storedNumber: number | null;
}

type Stored = { kind: "new" } | { kind: "stored"; number: number } | { kind: "partial" };

interface SeriesGame {
  segments: PlacedReplay[];
  stored: Stored;
}

const SEGMENT_TITLE = /\bG(?<game>\d+)\.(?<part>\d+)\b/iu;

const segmentKey = (title: string) => {
  const groups = SEGMENT_TITLE.exec(title)?.groups;

  return groups ? { game: Number(groups.game), part: Number(groups.part) } : null;
};

const storedState = (segments: readonly PlacedReplay[]) => {
  const numbers = new Set(segments.map(({ storedNumber }) => storedNumber));
  const [number] = numbers;

  if (numbers.size > 1) {
    return { kind: "partial" } satisfies Stored;
  }

  return number === null
    ? ({ kind: "new" } satisfies Stored)
    : ({ kind: "stored", number } satisfies Stored);
};

const groupGames = (placed: readonly PlacedReplay[]) => {
  const games: PlacedReplay[][] = [];
  const split = new Map<number, PlacedReplay[]>();

  const ordered = placed.toSorted(
    (a, b) =>
      (segmentKey(a.replay.title)?.part ?? 0) - (segmentKey(b.replay.title)?.part ?? 0) ||
      byPlayedAt(a.replay, b.replay),
  );

  for (const entry of ordered) {
    const key = segmentKey(entry.replay.title);
    const known = key === null ? undefined : split.get(key.game);

    if (known) {
      known.push(entry);
      continue;
    }

    const segments = [entry];
    games.push(segments);

    if (key !== null) {
      split.set(key.game, segments);
    }
  }

  return games
    .toSorted((a, b) => byPlayedAt(a[0].replay, b[0].replay))
    .map((segments) => ({ segments, stored: storedState(segments) }) satisfies SeriesGame);
};

const seriesProblem = (match: CandidateMatch, games: readonly SeriesGame[]) => {
  const placedIds = new Set(
    games.flatMap(({ segments }) => segments.map((segment) => segment.replay.id)),
  );

  if (
    match.storedReplayIds.some((id) => !placedIds.has(id)) ||
    games.some(({ stored }) => stored.kind === "partial")
  ) {
    return "match_has_other_stats" satisfies UnmatchedReason | null;
  }

  if (match.numberOfGames !== null && games.length > match.numberOfGames) {
    return "inconsistent_series" satisfies UnmatchedReason | null;
  }

  const wins = new Map<string, number>();

  for (const { segments } of games) {
    const [{ replay, sides }] = segments.toReversed();

    if (replay.blue.goals === replay.orange.goals) {
      return "inconsistent_series" satisfies UnmatchedReason | null;
    }

    const winner = replay.blue.goals > replay.orange.goals ? sides.blue : sides.orange;
    wins.set(winner, (wins.get(winner) ?? 0) + 1);
  }

  const played = [...match.scores.values()].reduce((sum, score) => sum + score, 0);

  if (!match.finished || played === 0) {
    return "match_not_finished" satisfies UnmatchedReason | null;
  }

  for (const [participantId, won] of wins) {
    if (won > (match.scores.get(participantId) ?? 0)) {
      return "inconsistent_series" satisfies UnmatchedReason | null;
    }
  }

  if (games.length < played) {
    return "incomplete_series" satisfies UnmatchedReason | null;
  }

  if (games.some(({ stored }, index) => stored.kind === "stored" && stored.number !== index + 1)) {
    return "match_has_other_stats" satisfies UnmatchedReason | null;
  }

  return null satisfies UnmatchedReason | null;
};

const seriesAssignments = (
  matches: readonly CandidateMatch[],
  series: ReadonlyMap<string, readonly PlacedReplay[]>,
) => {
  const assignments: ReplayAssignment[] = [];

  for (const match of matches) {
    const placed = series.get(match.id);

    if (!placed) {
      continue;
    }

    const games = groupGames(placed);
    const problem = seriesProblem(match, games);

    for (const [index, { segments, stored }] of games.entries()) {
      if (problem) {
        for (const { replay, sides, storedNumber } of segments) {
          if (storedNumber === null) {
            assignments.push({
              kind: "unmatched",
              matchId: match.id,
              reason: problem,
              replay,
              sides,
            });
          }
        }
      } else if (stored.kind === "new") {
        assignments.push({
          gameNumber: index + 1,
          kind: "matched",
          matchId: match.id,
          segments: segments.map(({ replay, sides }) => ({ replay, sides })),
        });
      }
    }
  }

  return assignments;
};

export const firstReplay = (assignment: ReplayAssignment) => {
  switch (assignment.kind) {
    case "matched": {
      return assignment.segments[0].replay;
    }

    case "stored":
    case "unmatched": {
      return assignment.replay;
    }

    default: {
      const exhaustive: never = assignment;

      return exhaustive;
    }
  }
};

/**
 * `stored` locates replays already saved, in any match; they are reported where they are and never
 * fetched, moved or renumbered. `excluded` holds replays staff removed; they count as absent.
 */
export const assignReplays = (
  replays: readonly ReplaySummary[],
  matches: readonly CandidateMatch[],
  stored: ReadonlyMap<string, GameLocation> = new Map(),
  excluded: ReadonlySet<string> = new Set(),
) => {
  const assignments: ReplayAssignment[] = [];
  const series = new Map<string, PlacedReplay[]>();

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
        matchId: null,
        reason: "excluded_by_staff",
        replay,
        sides: null,
      });
      continue;
    }

    const location = stored.get(replay.id);

    if (location) {
      assignments.push({
        gameNumber: location.number,
        kind: "stored",
        matchId: location.matchId,
        replay,
      });
    } else if (replay.rocketLeagueId !== null && replay.rocketLeagueId !== "") {
      if (seen.has(replay.rocketLeagueId) || taken.has(replay.rocketLeagueId)) {
        assignments.push({
          kind: "unmatched",
          matchId: null,
          reason: "duplicate_replay",
          replay,
          sides: null,
        });
        continue;
      }

      seen.add(replay.rocketLeagueId);
    }

    const placement = place(replay, matches);

    if (placement.kind === "unmatched") {
      if (!location) {
        assignments.push({
          kind: "unmatched",
          matchId: null,
          reason: placement.reason,
          replay,
          sides: null,
        });
      }

      continue;
    }

    if (location && location.matchId !== placement.matchId) {
      continue;
    }

    const placed = series.get(placement.matchId) ?? [];
    placed.push({ replay, sides: placement.sides, storedNumber: location?.number ?? null });
    series.set(placement.matchId, placed);
  }

  return [...assignments, ...seriesAssignments(matches, series)];
};

export const resolvePlayerId = (inGameName: string, roster: readonly RosterPlayer[]) => {
  const found = roster.filter((player) => playerNameMatches(inGameName, player.name));

  return found.length === 1 ? found[0].id : null;
};
