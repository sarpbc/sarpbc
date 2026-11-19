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

const isKickoff = (current: CurrentGame, reading: ScoreReading) =>
  reading.blue === 0 &&
  reading.orange === 0 &&
  !reading.overtime &&
  current.lastClock >= 0 &&
  (current.overtime || reading.clock > current.lastClock + CLOCK_REWIND_SECONDS);

const isNextGoal = (current: CurrentGame, candidate: Candidate) =>
  candidate.blue >= current.blue &&
  candidate.orange >= current.orange &&
  candidate.blue + candidate.orange === current.blue + current.orange + 1;

const adoptUnconfirmed = (current: CurrentGame) => {
  const { unconfirmed } = current;

  if (current.blue !== current.orange || unconfirmed === null) {
    return;
  }

  current.blue = unconfirmed.blue;
  current.orange = unconfirmed.orange;
  current.lastSeen = unconfirmed.since;
  current.agreeing += unconfirmed.count;
};

export class SeriesTracker {
  readonly #settings: TrackerSettings;
  readonly #games: StreamScoreGame[] = [];
  readonly #frames: StreamScoreFrameCounts = {
    accepted: 0,
    hidden: 0,
    read: 0,
    rejected: 0,
    unreadable: 0,
  };
  #current: CurrentGame | null = null;
  #candidate: Candidate | null = null;
  #awaitingKickoff = false;

  constructor(settings: TrackerSettings) {
    this.#settings = settings;
  }

  get games() {
    return this.#games;
  }

  get decided() {
    return this.#winner() !== null;
  }

  push(t: number, reading: ScoreboardReading) {
    this.#frames.read += 1;

    if (this.decided) {
      return;
    }

    switch (reading.kind) {
      case "hidden": {
        this.#frames.hidden += 1;

        return;
      }

      case "unreadable": {
        this.#frames.unreadable += 1;

        return;
      }

      case "score": {
        this.#frames.accepted += 1;
        this.#score(t, reading);

        return;
      }

      default: {
        const exhaustive: never = reading;
        throw new Error(`Unknown reading ${JSON.stringify(exhaustive)}`);
      }
    }
  }

  finish() {
    const current = this.#current;

    if (current === null || this.decided) {
      return;
    }

    if (!current.overtime && current.lastClock !== 0) {
      return;
    }

    adoptUnconfirmed(current);
    this.#close("stream_end", current.lastSeen);
  }

  proposal(source: ProposalSource) {
    return {
      ...source,
      bestOf: this.#settings.bestOf,
      frames: { ...this.#frames },
      games: [...this.#games],
      series: { blue: this.#wins("blue"), orange: this.#wins("orange"), winner: this.#winner() },
    } satisfies StreamScoreProposal;
  }

  #wins(side: StreamScoreSide) {
    return this.#games.filter((game) => game.winner === side).length;
  }

  #winner() {
    const needed = winsNeeded(this.#settings.bestOf);

    if (this.#wins("blue") >= needed) {
      return "blue";
    }

    if (this.#wins("orange") >= needed) {
      return "orange";
    }

    return null;
  }

  #score(t: number, reading: ScoreReading) {
    const previous = this.#candidate;

    const candidate: Candidate =
      previous !== null && previous.blue === reading.blue && previous.orange === reading.orange
        ? { ...previous, count: previous.count + 1 }
        : { blue: reading.blue, count: 1, orange: reading.orange, since: t };

    this.#candidate = candidate;
    const stable = this.#settings.stableReadings;
    const current = this.#current;

    if (current !== null && isKickoff(current, reading)) {
      const kickoff: Candidate =
        current.kickoff === null
          ? { blue: 0, count: 1, orange: 0, since: t }
          : { ...current.kickoff, count: current.kickoff.count + 1 };

      current.kickoff = kickoff;

      if (kickoff.count >= stable) {
        this.#restart(current, kickoff);
      }

      return;
    }

    if (current !== null) {
      current.kickoff = null;
      current.readings += 1;
    }

    if (candidate.count === stable) {
      this.#commit(candidate);
    }

    if (current === null || this.#current !== current) {
      return;
    }

    if (current.blue !== reading.blue || current.orange !== reading.orange) {
      if (candidate.count < stable && isNextGoal(current, candidate)) {
        current.unconfirmed = candidate;
      }

      return;
    }

    this.#advance(current, t, reading);
  }

  #advance(current: CurrentGame, t: number, reading: ScoreReading) {
    const stable = this.#settings.stableReadings;
    current.agreeing += 1;
    current.lastSeen = t;
    current.lastClock = reading.clock;
    current.overtimeReadings = reading.overtime ? current.overtimeReadings + 1 : 0;
    current.zeroClockReadings =
      !reading.overtime && reading.clock === 0 ? current.zeroClockReadings + 1 : 0;

    if (current.blue === current.orange) {
      if (current.overtimeReadings >= stable) {
        current.overtime = true;
      }

      return;
    }

    if (current.overtime) {
      this.#close("overtime", t);
    } else if (current.zeroClockReadings >= stable) {
      this.#close("regulation", t);
    }
  }

  #commit(candidate: Candidate) {
    const current = this.#current;

    if (current === null) {
      if (!this.#awaitingKickoff || (candidate.blue === 0 && candidate.orange === 0)) {
        this.#start(candidate);
      }

      return;
    }

    if (candidate.blue === current.blue && candidate.orange === current.orange) {
      return;
    }

    if (candidate.blue < current.blue || candidate.orange < current.orange) {
      this.#frames.rejected += 1;

      return;
    }

    current.blue = candidate.blue;
    current.orange = candidate.orange;
    current.agreeing += candidate.count - 1;
    current.unconfirmed = null;
  }

  #restart(current: CurrentGame, kickoff: Candidate) {
    adoptUnconfirmed(current);
    this.#close("reset", current.lastSeen);

    if (!this.decided) {
      this.#start(kickoff);
    }
  }

  #start(candidate: Candidate) {
    this.#current = {
      agreeing: candidate.count,
      blue: candidate.blue,
      kickoff: null,
      lastClock: -1,
      lastSeen: candidate.since,
      orange: candidate.orange,
      overtime: false,
      overtimeReadings: 0,
      readings: candidate.count,
      startedAt: candidate.since,
      unconfirmed: null,
      zeroClockReadings: 0,
    };
    this.#awaitingKickoff = false;
  }

  #close(endedBy: StreamScoreGameEnding, endedAt: number) {
    const current = this.#current;

    if (current === null) {
      return;
    }

    this.#current = null;
    const winner = gameWinner(current);
    const played = current.overtime || current.lastClock === 0;

    if (winner === null && !played) {
      return;
    }

    this.#awaitingKickoff = true;
    this.#games.push({
      blue: current.blue,
      confidence:
        winner === null ? 0 : Math.round((current.agreeing / current.readings) * 1000) / 1000,
      endedAt,
      endedBy,
      number: this.#games.length + 1,
      orange: current.orange,
      startedAt: current.startedAt,
      winner,
    });
  }
}
