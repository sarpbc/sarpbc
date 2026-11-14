import type {
  CircuitEventStatus,
  CircuitScaleTier,
  CircuitStandingCell,
  CircuitStandingRow,
  CircuitStandingsEvent,
  CircuitStandingTeam,
  TournamentEventRef,
} from "@sarpbc/types";
import { isWorldwideCircuitRegion } from "@sarpbc/utils";
import { pointsForPlacement } from "./circuit-scale";

export interface StagePlacement {
  team: CircuitStandingTeam;
  placement: number;
}

export interface CircuitStageResult {
  event: TournamentEventRef;
  beginAt: Date | null;
  endAt: Date | null;
  scale: readonly CircuitScaleTier[];
  sourceUrl: string;
  worldwide: boolean;
  regionTeamIds: readonly string[];
  placements: readonly StagePlacement[];
  finishes: readonly StagePlacement[];
}

export interface ComputedStandings {
  sourceUrls: string[];
  events: CircuitStandingsEvent[];
  rows: CircuitStandingRow[];
}

interface TeamTally {
  team: CircuitStandingTeam;
  points: number;
  cells: Map<string, CircuitStandingCell>;
}

function hasEnded(stage: CircuitStageResult, now: Date): boolean {
  return stage.endAt !== null && stage.endAt <= now;
}

function hasBegun(stage: CircuitStageResult, now: Date): boolean {
  return stage.beginAt !== null && stage.beginAt <= now;
}

function eventStatus(stages: readonly CircuitStageResult[], now: Date): CircuitEventStatus {
  const scaled = stages.filter((stage) => stage.scale.length > 0);

  if (!scaled.length) return "scale_missing";

  if (scaled.every((stage) => !hasBegun(stage, now) && !hasEnded(stage, now))) return "upcoming";

  if (scaled.some((stage) => !hasEnded(stage, now))) return "in_progress";

  if (scaled.every((stage) => stage.placements.length === 0 && stage.finishes.length === 0))
    return "awaiting_results";

  return "counted";
}

function creditedPlacements(stage: CircuitStageResult, regional: boolean): StagePlacement[] {
  const finished = new Set(stage.finishes.map(({ team }) => team.id));

  const placements = [
    ...stage.placements.filter(({ team }) => !finished.has(team.id)),
    ...stage.finishes,
  ];

  if (!regional || !stage.worldwide) return placements;
  const region = new Set(stage.regionTeamIds);

  return placements.filter(({ team }) => region.has(team.id));
}

function bound(dates: readonly (Date | null)[], pick: "earliest" | "latest"): string | null {
  const times = dates.flatMap((date) => (date ? [date.getTime()] : []));

  if (!times.length) return null;

  return new Date(pick === "earliest" ? Math.min(...times) : Math.max(...times)).toISOString();
}

function compareEvents(a: CircuitStandingsEvent, b: CircuitStandingsEvent): number {
  if (a.beginAt !== b.beginAt) {
    if (a.beginAt === null) return 1;

    if (b.beginAt === null) return -1;

    return a.beginAt.localeCompare(b.beginAt);
  }

  return a.event.name.localeCompare(b.event.name);
}

export function computeCircuitStandings(
  stages: readonly CircuitStageResult[],
  region: string | null,
  now: Date,
): ComputedStandings {
  const regional = !isWorldwideCircuitRegion(region);
  const groups = new Map<string, { event: TournamentEventRef; stages: CircuitStageResult[] }>();

  for (const stage of stages) {
    const group = groups.get(stage.event.id) ?? { event: stage.event, stages: [] };
    group.stages.push(stage);
    groups.set(stage.event.id, group);
  }

  const events = [...groups.values()]
    .map(({ event, stages: eventStages }) => ({
      event,
      beginAt: bound(
        eventStages.map((stage) => stage.beginAt),
        "earliest",
      ),
      endAt: bound(
        eventStages.map((stage) => stage.endAt),
        "latest",
      ),
      status: eventStatus(eventStages, now),
    }))
    .toSorted(compareEvents);

  const tallies = new Map<string, TeamTally>();

  for (const stage of stages) {
    if (!hasEnded(stage, now)) continue;

    for (const { team, placement } of creditedPlacements(stage, regional)) {
      const points = pointsForPlacement(stage.scale, placement);

      if (points === null) continue;

      const tally = tallies.get(team.id) ?? {
        team,
        points: 0,
        cells: new Map<string, CircuitStandingCell>(),
      };

      const cell = tally.cells.get(stage.event.id);
      tally.cells.set(stage.event.id, {
        eventId: stage.event.id,
        points: (cell?.points ?? 0) + points,
        placement: Math.min(cell?.placement ?? placement, placement),
      });
      tally.points += points;
      tallies.set(team.id, tally);
    }
  }

  const order = new Map(events.map(({ event }, index) => [event.id, index]));

  const sorted = [...tallies.values()].toSorted(
    (a, b) => b.points - a.points || a.team.name.localeCompare(b.team.name),
  );

  const rows = sorted.map((tally): CircuitStandingRow => ({
    rank: sorted.findIndex((other) => other.points === tally.points) + 1,
    points: tally.points,
    team: tally.team,
    events: [...tally.cells.values()].toSorted(
      (a, b) => (order.get(a.eventId) ?? 0) - (order.get(b.eventId) ?? 0),
    ),
  }));

  const sourceUrls = [
    ...new Set(stages.flatMap((stage) => (stage.scale.length > 0 ? [stage.sourceUrl] : []))),
  ];

  return { sourceUrls, events, rows };
}
