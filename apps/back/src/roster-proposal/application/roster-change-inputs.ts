import type {
  CircuitStageScaleInput,
  PrizeEntry,
  ProposedPrizeEntry,
  RosterChange,
  StreamInput,
} from "@sarpbc/types";
import type { StreamOwner } from "../../tournament/domain/stream";

type CircuitStageChange = Extract<RosterChange, { kind: "set_circuit_stage_scale" }>;

export function circuitStageInput(
  { scale, worldwide, regionTeamIds, finishes }: CircuitStageChange,
  sourceUrl: string,
): CircuitStageScaleInput {
  return { scale, sourceUrl, worldwide, regionTeamIds, finishes };
}

export function sourcedPrizes(prizes: ProposedPrizeEntry[], sourceUrl: string): PrizeEntry[] {
  return prizes.map((prize) => ({ ...prize, sourceUrl }));
}

export interface StreamChange {
  owner: StreamOwner;
  streams: StreamInput[];
}

type StreamRosterChange = Extract<
  RosterChange,
  { kind: "set_event_streams" | "set_tournament_streams" | "set_match_streams" }
>;

export function streamChangeFor(change: StreamRosterChange): StreamChange {
  switch (change.kind) {
    case "set_event_streams":
      return { owner: { kind: "event", id: change.eventId }, streams: change.streams };
    case "set_tournament_streams":
      return { owner: { kind: "tournament", id: change.tournamentId }, streams: change.streams };
    case "set_match_streams":
      return { owner: { kind: "match", id: change.matchId }, streams: change.streams };
    default: {
      const exhaustive: never = change;

      return exhaustive;
    }
  }
}

export function streamChangeOf(change: RosterChange): StreamChange | null {
  if (
    change.kind === "set_event_streams" ||
    change.kind === "set_tournament_streams" ||
    change.kind === "set_match_streams"
  ) {
    return streamChangeFor(change);
  }

  return null;
}
