import type {
  CircuitStageScaleInput,
  PrizeEntry,
  ProposedPrizeEntry,
  RosterChange,
  StreamInput,
} from "@sarpbc/types";
import type { StreamOwner } from "../../tournament/domain/stream";

type CircuitStageChange = Extract<RosterChange, { kind: "set_circuit_stage_scale" }>;

export const circuitStageInput = (
  { scale, worldwide, regionTeamIds, finishes }: CircuitStageChange,
  sourceUrl: string,
) => ({ finishes, regionTeamIds, scale, sourceUrl, worldwide }) satisfies CircuitStageScaleInput;

export const sourcedPrizes = (prizes: ProposedPrizeEntry[], sourceUrl: string) =>
  prizes.map((prize) => ({ ...prize, sourceUrl })) satisfies PrizeEntry[];

export interface StreamChange {
  owner: StreamOwner;
  streams: StreamInput[];
}

type StreamRosterChange = Extract<
  RosterChange,
  { kind: "set_event_streams" | "set_tournament_streams" | "set_match_streams" }
>;

export const streamChangeFor = ((change) => {
  switch (change.kind) {
    case "set_event_streams": {
      return { owner: { id: change.eventId, kind: "event" }, streams: change.streams };
    }

    case "set_tournament_streams": {
      return { owner: { id: change.tournamentId, kind: "tournament" }, streams: change.streams };
    }

    case "set_match_streams": {
      return { owner: { id: change.matchId, kind: "match" }, streams: change.streams };
    }

    default: {
      const exhaustive: never = change;

      return exhaustive;
    }
  }
}) satisfies (change: StreamRosterChange) => StreamChange;

export const streamChangeOf = (change: RosterChange) => {
  if (
    change.kind === "set_event_streams" ||
    change.kind === "set_tournament_streams" ||
    change.kind === "set_match_streams"
  ) {
    return streamChangeFor(change);
  }

  return null;
};
