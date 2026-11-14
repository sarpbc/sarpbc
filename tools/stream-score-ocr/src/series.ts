import type {
  StreamScoreFrameCounts,
  StreamScoreGame,
  StreamScoreGameEnding,
  StreamScoreProposal,
  StreamScoreSide,
} from "@sarpbc/types";
import { gameWinner, winsNeeded } from "@sarpbc/utils/stream-score";
import type { ScoreboardReading } from "./scoreboard.ts";

export interface TrackerSettings {
  bestOf: number;
  stableReadings: number;
}

export interface ProposalSource {
  overlay: string;
  source: string;
  sourceStartedAt: string | null;
}

type ScoreReading = Extract<ScoreboardReading, { kind: "score" }>;

interface Candidate {
  blue: number;
  orange: number;
  since: number;
  count: number;
}

interface CurrentGame {
  startedAt: number;
  lastSeen: number;
  lastClock: number;
  blue: number;
  orange: number;
  readings: number;
  agreeing: number;
  overtime: boolean;
  overtimeReadings: number;
  zeroClockReadings: number;
  unconfirmed: Candidate | null;
  kickoff: Candidate | null;
}

const CLOCK_REWIND_SECONDS = 5;

function isKickoff(current: CurrentGame, reading: ScoreReading): boolean {
  return (
    reading.blue === 0 &&
    reading.orange === 0 &&
    !reading.overtime &&
    current.lastClock >= 0 &&
    (current.overtime || reading.clock > current.lastClock + CLOCK_REWIND_SECONDS)
  );
}

function isNextGoal(current: CurrentGame, candidate: Candidate): boolean {
  return (
    candidate.blue >= current.blue &&
    candidate.orange >= current.orange &&
    candidate.blue + candidate.orange === current.blue + current.orange + 1
  );
}

function adoptUnconfirmed(current: CurrentGame): void {
  const { unconfirmed } = current;

  if (current.blue !== current.orange || unconfirmed === null) return;
  current.blue = unconfirmed.blue;
  current.orange = unconfirmed.orange;
  current.lastSeen = unconfirmed.since;
  current.agreeing += unconfirmed.count;
}

export class SeriesTracker {
  readonly #settings: TrackerSettings;
  readonly #games: StreamScoreGame[] = [];
  readonly #frames: StreamScoreFrameCounts = {
    read: 0,
    accepted: 0,
    hidden: 0,
    unreadable: 0,
    rejected: 0,
  };
  #current: CurrentGame | null = null;
  #candidate: Candidate | null = null;
  #awaitingKickoff = false;

  constructor(settings: TrackerSettings) {
    this.#settings = settings;
  }

  get games(): readonly StreamScoreGame[] {
    return this.#games;
  }

  get decided(): boolean {
    return this.#winner() !== null;
  }

  push(t: number, reading: ScoreboardReading): void {
    this.#frames.read += 1;

    if (this.decided) return;

    switch (reading.kind) {
      case "hidden":
        this.#frames.hidden += 1;

        return;
      case "unreadable":
        this.#frames.unreadable += 1;

        return;
      case "score":
        this.#frames.accepted += 1;
        this.#score(t, reading);

        return;
      default: {
        const exhaustive: never = reading;
        throw new Error(`Unknown reading ${JSON.stringify(exhaustive)}`);
      }
    }
  }

  finish(): void {
    const current = this.#current;

    if (current === null || this.decided) return;

    if (!current.overtime && current.lastClock !== 0) return;
    adoptUnconfirmed(current);
    this.#close("stream_end", current.lastSeen);
  }

  proposal(source: ProposalSource): StreamScoreProposal {
    return {
      ...source,
      bestOf: this.#settings.bestOf,
      games: [...this.#games],
      series: { blue: this.#wins("blue"), orange: this.#wins("orange"), winner: this.#winner() },
      frames: { ...this.#frames },
    };
  }

  #wins(side: StreamScoreSide): number {
    return this.#games.filter((game) => game.winner === side).length;
  }

  #winner(): StreamScoreSide | null {
    const needed = winsNeeded(this.#settings.bestOf);

    if (this.#wins("blue") >= needed) return "blue";

    if (this.#wins("orange") >= needed) return "orange";

    return null;
  }

  #score(t: number, reading: ScoreReading): void {
    const previous = this.#candidate;

    const candidate: Candidate =
      previous !== null && previous.blue === reading.blue && previous.orange === reading.orange
        ? { ...previous, count: previous.count + 1 }
        : { blue: reading.blue, orange: reading.orange, since: t, count: 1 };

    this.#candidate = candidate;
    const stable = this.#settings.stableReadings;
    const current = this.#current;

    if (current !== null && isKickoff(current, reading)) {
      const kickoff: Candidate =
        current.kickoff === null
          ? { blue: 0, orange: 0, since: t, count: 1 }
          : { ...current.kickoff, count: current.kickoff.count + 1 };

      current.kickoff = kickoff;

      if (kickoff.count >= stable) this.#restart(current, kickoff);

      return;
    }

    if (current !== null) {
      current.kickoff = null;
      current.readings += 1;
    }

    if (candidate.count === stable) this.#commit(candidate);

    if (current === null || this.#current !== current) return;

    if (current.blue !== reading.blue || current.orange !== reading.orange) {
      if (candidate.count < stable && isNextGoal(current, candidate)) {
        current.unconfirmed = candidate;
      }

      return;
    }

    this.#advance(current, t, reading);
  }

  #advance(current: CurrentGame, t: number, reading: ScoreReading): void {
    const stable = this.#settings.stableReadings;
    current.agreeing += 1;
    current.lastSeen = t;
    current.lastClock = reading.clock;
    current.overtimeReadings = reading.overtime ? current.overtimeReadings + 1 : 0;
    current.zeroClockReadings =
      !reading.overtime && reading.clock === 0 ? current.zeroClockReadings + 1 : 0;

    if (current.blue === current.orange) {
      if (current.overtimeReadings >= stable) current.overtime = true;

      return;
    }

    if (current.overtime) this.#close("overtime", t);
    else if (current.zeroClockReadings >= stable) this.#close("regulation", t);
  }

  #commit(candidate: Candidate): void {
    const current = this.#current;

    if (current === null) {
      if (!this.#awaitingKickoff || (candidate.blue === 0 && candidate.orange === 0)) {
        this.#start(candidate);
      }

      return;
    }

    if (candidate.blue === current.blue && candidate.orange === current.orange) return;

    if (candidate.blue < current.blue || candidate.orange < current.orange) {
      this.#frames.rejected += 1;

      return;
    }

    current.blue = candidate.blue;
    current.orange = candidate.orange;
    current.agreeing += candidate.count - 1;
    current.unconfirmed = null;
  }

  #restart(current: CurrentGame, kickoff: Candidate): void {
    adoptUnconfirmed(current);
    this.#close("reset", current.lastSeen);

    if (!this.decided) this.#start(kickoff);
  }

  #start(candidate: Candidate): void {
    this.#current = {
      startedAt: candidate.since,
      lastSeen: candidate.since,
      lastClock: -1,
      blue: candidate.blue,
      orange: candidate.orange,
      readings: candidate.count,
      agreeing: candidate.count,
      overtime: false,
      overtimeReadings: 0,
      zeroClockReadings: 0,
      unconfirmed: null,
      kickoff: null,
    };
    this.#awaitingKickoff = false;
  }

  #close(endedBy: StreamScoreGameEnding, endedAt: number): void {
    const current = this.#current;

    if (current === null) return;
    this.#current = null;
    const winner = gameWinner(current);
    const played = current.overtime || current.lastClock === 0;

    if (winner === null && !played) return;
    this.#awaitingKickoff = true;
    this.#games.push({
      number: this.#games.length + 1,
      blue: current.blue,
      orange: current.orange,
      winner,
      endedBy,
      startedAt: current.startedAt,
      endedAt,
      confidence:
        winner === null ? 0 : Math.round((current.agreeing / current.readings) * 1000) / 1000,
    });
  }
}
