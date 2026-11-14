import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { OVERLAY_PATH } from "../fixtures/accuracy.ts";
import { FixtureRenderer } from "../fixtures/render.ts";
import type { Scene, ScorebugScene } from "../fixtures/render.ts";
import { loadOverlay } from "./overlay.ts";
import type { Overlay } from "./overlay.ts";
import { readScoreboard } from "./scoreboard.ts";

const SIZES = [
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 },
  { width: 960, height: 540 },
] as const;

const scorebug = (
  blue: number,
  orange: number,
  clock: number,
  overtime: boolean,
): ScorebugScene => ({
  kind: "scorebug",
  blue,
  orange,
  clock,
  overtime,
  replay: false,
  fade: 1,
  glitch: false,
});

void describe("readScoreboard", () => {
  let overlay: Overlay;
  before(async () => {
    overlay = await loadOverlay(OVERLAY_PATH);
  });

  void it("reads scores, the regulation clock and overtime at every broadcast size", () => {
    for (const [index, size] of SIZES.entries()) {
      const renderer = new FixtureRenderer(size, index + 1);

      for (const [blue, orange, clock, overtime] of [
        [0, 0, 300, false],
        [3, 1, 187, false],
        [10, 9, 0, false],
        [2, 2, 64, true],
        [6, 7, 59, false],
        [4, 8, 125, true],
      ] as const) {
        const reading = readScoreboard(
          renderer.render(scorebug(blue, orange, clock, overtime), 8),
          overlay,
        );

        assert.equal(reading.kind, "score", `${size.height}p ${blue}-${orange} ${clock}`);

        if (reading.kind !== "score") {
          continue;
        }

        assert.deepEqual(
          [reading.blue, reading.orange, reading.clock, reading.overtime],
          [blue, orange, clock, overtime],
        );
        assert.ok(reading.confidence >= overlay.text.minConfidence);
      }
    }
  });

  void it("ignores replays, faded transitions and screens without the scorebug", () => {
    const renderer = new FixtureRenderer({ width: 1920, height: 1080 }, 9);

    const scenes: Scene[] = [
      { ...scorebug(1, 0, 200, false), replay: true },
      { ...scorebug(1, 0, 200, false), fade: 0.4 },
      { kind: "hidden", variant: 0 },
      { kind: "hidden", variant: 2 },
    ];

    for (const scene of scenes) {
      assert.deepEqual(readScoreboard(renderer.render(scene, 8), overlay), { kind: "hidden" });
    }
  });

  void it("never reads a wrong score from corrupted frames", () => {
    for (const [index, size] of SIZES.entries()) {
      const renderer = new FixtureRenderer(size, index + 20);

      for (let frame = 0; frame < 20; frame += 1) {
        const reading = readScoreboard(
          renderer.render({ ...scorebug(3, 1, 187, false), glitch: true }, 8),
          overlay,
        );

        if (reading.kind !== "score") {
          continue;
        }

        assert.deepEqual([reading.blue, reading.orange, reading.clock], [3, 1, 187]);
      }
    }
  });
});
