import type { StreamScoreSide } from "@sarpbc/types";
import type { Size } from "../src/frame.ts";
import { seededRandom } from "./render.ts";
import type { Scene, ScorebugScene } from "./render.ts";

export interface Goal {
  clock: number;
  side: StreamScoreSide;
}

export interface GameScript {
  goals: Goal[];
  overtime: { seconds: number; side: StreamScoreSide } | null;
  pauseAt: number | null;
}

export interface SeriesScript {
  id: string;
  bestOf: number;
  size: Size;
  noise: number;
  seed: number;
  games: GameScript[];
}

export interface TimedScene {
  t: number;
  scene: Scene;
}

export interface FinalScore {
  blue: number;
  orange: number;
}

const GAME_SECONDS = 300;

const RESOLUTIONS: readonly Size[] = [
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 },
  { width: 960, height: 540 },
];

export function finalScores(script: SeriesScript): FinalScore[] {
  return script.games.map((game) => {
    const goals = game.overtime === null ? game.goals : [...game.goals, game.overtime];

    return {
      blue: goals.filter((goal) => goal.side === "blue").length,
      orange: goals.filter((goal) => goal.side === "orange").length,
    };
  });
}

function scriptedGame(random: () => number, winner: StreamScoreSide): GameScript {
  const loser: StreamScoreSide = winner === "blue" ? "orange" : "blue";
  const overtime = random() < 0.2;
  const loserGoals = Math.floor(random() * 4);
  const winnerGoals = overtime ? loserGoals : loserGoals + 1 + Math.floor(random() * 3);

  const sides: StreamScoreSide[] = [
    ...Array.from({ length: winnerGoals }, () => winner),
    ...Array.from({ length: loserGoals }, () => loser),
  ];

  const clocks = new Set<number>();

  while (clocks.size < sides.length) {
    clocks.add(10 + Math.floor(random() * (GAME_SECONDS - 20)));
  }

  const ordered = [...clocks].toSorted((a, b) => b - a);

  const shuffled = sides
    .map((side) => ({ side, key: random() }))
    .toSorted((a, b) => a.key - b.key)
    .map(({ side }) => side);

  return {
    goals: ordered.map((clock, index) => ({ clock, side: shuffled[index] ?? winner })),
    overtime: overtime ? { seconds: 5 + Math.floor(random() * 150), side: winner } : null,
    pauseAt: random() < 0.15 ? 60 + Math.floor(random() * 180) : null,
  };
}

export function generateSeries(count: number, seed: number): SeriesScript[] {
  const random = seededRandom(seed);

  return Array.from({ length: count }, (_, index) => {
    const bestOf = index % 4 === 3 ? 7 : 5;
    const needed = Math.floor(bestOf / 2) + 1;
    const wins = { blue: 0, orange: 0 };
    const games: GameScript[] = [];

    while (wins.blue < needed && wins.orange < needed) {
      const winner: StreamScoreSide = random() < 0.5 ? "blue" : "orange";
      wins[winner] += 1;
      games.push(scriptedGame(random, winner));
    }

    return {
      id: `series-${String(index + 1).padStart(2, "0")}`,
      bestOf,
      size: RESOLUTIONS[index % RESOLUTIONS.length] ?? { width: 1920, height: 1080 },
      noise: 6 + Math.floor(random() * 20),
      seed: Math.floor(random() * 2 ** 31),
      games,
    };
  });
}

function scorebug(score: FinalScore, clock: number, overtime: boolean): ScorebugScene {
  return { kind: "scorebug", ...score, clock, overtime, replay: false, fade: 1, glitch: false };
}

export function* broadcast(script: SeriesScript): Generator<TimedScene> {
  const random = seededRandom(script.seed);
  let t = 0;

  function* hold(scene: Scene, seconds: number): Generator<TimedScene> {
    for (let second = 0; second < seconds; second += 1) {
      const glitch = scene.kind === "scorebug" && random() < 0.02;
      const cut = scene.kind === "scorebug" && random() < 0.01;
      let shown: Scene = scene;

      if (cut) {
        shown = { kind: "hidden", variant: 4 };
      } else if (scene.kind === "scorebug") {
        shown = { ...scene, glitch };
      }

      yield { t, scene: shown };
      t += 1;
    }
  }

  yield* hold({ kind: "hidden", variant: 0 }, 20);

  for (const [index, game] of script.games.entries()) {
    if (index > 0) {
      yield* hold({ kind: "hidden", variant: 1 }, 12);
      yield* hold({ kind: "hidden", variant: index % 2 === 0 ? 2 : 3 }, index % 2 === 0 ? 30 : 8);
    }

    const score: FinalScore = { blue: 0, orange: 0 };
    yield* hold({ ...scorebug(score, GAME_SECONDS, false), fade: 0.4 }, 2);
    yield* hold(scorebug(score, GAME_SECONDS, false), 3);
    let clock = GAME_SECONDS;

    while (clock > 0) {
      clock -= 1;
      yield* hold(scorebug(score, clock, false), 1);

      if (clock === game.pauseAt) {
        yield* hold(scorebug(score, clock, false), 15);
      }

      const tick = clock;
      const goal = game.goals.find((candidate) => candidate.clock === tick);

      if (goal === undefined) {
        continue;
      }

      score[goal.side] += 1;
      yield* hold(scorebug(score, clock, false), 3);

      if (clock === 0) {
        break;
      }

      yield* hold({ ...scorebug(score, clock, false), replay: true }, 6);
      yield* hold(scorebug(score, clock, false), 3);
    }

    if (game.overtime === null) {
      yield* hold(scorebug(score, 0, false), 3);
      continue;
    }

    yield* hold(scorebug(score, 0, false), 4);

    for (let seconds = 0; seconds <= game.overtime.seconds; seconds += 1) {
      yield* hold(scorebug(score, seconds, true), 1);
    }

    score[game.overtime.side] += 1;
    yield* hold(scorebug(score, game.overtime.seconds, true), 2);
  }

  yield* hold({ kind: "hidden", variant: 1 }, 20);
}
