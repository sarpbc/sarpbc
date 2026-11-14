import { fileURLToPath } from "node:url";
import { parseStreamScoreProposal } from "@sarpbc/utils/stream-score";
import { loadOverlay } from "../src/overlay.ts";
import { readScoreboard } from "../src/scoreboard.ts";
import { SeriesTracker } from "../src/series.ts";
import { broadcast, finalScores, generateSeries, type SeriesScript } from "./broadcast.ts";
import { FixtureRenderer } from "./render.ts";

export const OVERLAY_PATH = fileURLToPath(
  new URL("../overlays/coupe-de-france-slash-2026.json", import.meta.url),
);

export type SeriesOutcome = "correct" | "undetermined" | "wrong";

export interface SeriesResult {
  id: string;
  games: number;
  correctGames: number;
  undecidedGames: number;
  series: SeriesOutcome;
}

export interface Measure {
  games: number;
  correctGames: number;
  undecidedGames: number;
  rate: number;
  results: SeriesResult[];
}

function seriesOutcome(winner: string | null, expectedWinner: string): SeriesOutcome {
  if (winner === null) return "undetermined";

  return winner === expectedWinner ? "correct" : "wrong";
}

async function replay(script: SeriesScript, intervalSeconds: number): Promise<SeriesResult> {
  const overlay = await loadOverlay(OVERLAY_PATH);
  const renderer = new FixtureRenderer(script.size, script.seed);
  const tracker = new SeriesTracker({ bestOf: script.bestOf, stableReadings: 2 });

  for (const { t, scene } of broadcast(script)) {
    if (t % intervalSeconds !== 0) continue;
    tracker.push(t, readScoreboard(renderer.render(scene, script.noise), overlay));

    if (tracker.decided) break;
  }

  tracker.finish();

  const parsed = parseStreamScoreProposal(
    JSON.stringify(
      tracker.proposal({ overlay: overlay.id, source: script.id, sourceStartedAt: null }),
    ),
  );

  if (!parsed.ok) throw new Error(`${script.id} produced an invalid proposal: ${parsed.error}`);
  const expected = finalScores(script);

  const correctGames = expected.filter((score, index) => {
    const game = parsed.proposal.games[index];

    return game !== undefined && game.blue === score.blue && game.orange === score.orange;
  }).length;

  const blueWins = expected.filter((score) => score.blue > score.orange).length;
  const { winner } = parsed.proposal.series;
  const expectedWinner = blueWins > expected.length - blueWins ? "blue" : "orange";

  return {
    id: script.id,
    games: Math.max(expected.length, parsed.proposal.games.length),
    correctGames,
    undecidedGames: parsed.proposal.games.filter((game) => game.winner === null).length,
    series: seriesOutcome(winner, expectedWinner),
  };
}

export async function measureFixtures(intervalSeconds: number): Promise<Measure> {
  const results = await Promise.all(
    generateSeries(12, 20_261_102).map(async (script) => await replay(script, intervalSeconds)),
  );

  const games = results.reduce((total, result) => total + result.games, 0);
  const correctGames = results.reduce((total, result) => total + result.correctGames, 0);
  const undecidedGames = results.reduce((total, result) => total + result.undecidedGames, 0);

  return { games, correctGames, undecidedGames, rate: correctGames / games, results };
}

export function describeMeasure(measure: Measure): string[] {
  const wrongGames = measure.games - measure.correctGames - measure.undecidedGames;

  return [
    ...measure.results.map(
      (result) =>
        `${result.id}: ${result.correctGames}/${result.games} games, ${result.undecidedGames} undecided, series ${result.series}`,
    ),
    `game scores: ${measure.correctGames}/${measure.games} correct (${(measure.rate * 100).toFixed(1)}%), ${measure.undecidedGames} undecided, ${wrongGames} wrong`,
  ];
}
