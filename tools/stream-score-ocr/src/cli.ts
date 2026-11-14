import { createReadStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import type { StreamScoreProposal } from "@sarpbc/types";
import { readPpmFrames, scaleRegion } from "./frame.ts";
import type { Frame } from "./frame.ts";
import { glyphGrids, templateFromGrid } from "./glyph.ts";
import { loadOverlay } from "./overlay.ts";
import type { GlyphTemplate, Overlay, Region } from "./overlay.ts";
import { readScoreboard } from "./scoreboard.ts";
import { SeriesTracker } from "./series.ts";
import { streamFrames } from "./source.ts";

const USAGE = `Usage:
  node src/cli.ts read --overlay <file> --input <file|url> [--live] [--quality best]
                       [--interval 1] [--best-of 5] [--stable 2] [--out proposal.json]
  node src/cli.ts calibrate --overlay <file> --frame <frame.ppm>
                       --blue <score> --orange <score> --clock <m:ss|+m:ss>`;

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`--${name} must be a positive integer.`);
  }

  return parsed;
}

function required(value: string | undefined, name: string): string {
  if (value === undefined || value === "") {
    throw new Error(`--${name} is required.\n${USAGE}`);
  }

  return value;
}

async function writeProposal(
  proposal: StreamScoreProposal,
  out: string | undefined,
): Promise<void> {
  const json = `${JSON.stringify(proposal, null, 2)}\n`;

  if (out === undefined) {
    process.stdout.write(json);
  } else {
    await writeFile(out, json);
  }
}

async function read(args: readonly string[]): Promise<void> {
  const { values } = parseArgs({
    args: [...args],
    options: {
      overlay: { type: "string" },
      input: { type: "string" },
      live: { type: "boolean", default: false },
      quality: { type: "string", default: "best" },
      interval: { type: "string" },
      "best-of": { type: "string" },
      stable: { type: "string" },
      out: { type: "string" },
    },
  });

  const overlay = await loadOverlay(required(values.overlay, "overlay"));
  const input = required(values.input, "input");

  const tracker = new SeriesTracker({
    bestOf: positiveInteger(values["best-of"], 5, "best-of"),
    stableReadings: positiveInteger(values.stable, 2, "stable"),
  });

  const source = {
    overlay: overlay.id,
    source: input,
    sourceStartedAt: values.live ? new Date().toISOString() : null,
  };

  const frames = streamFrames({
    input,
    live: values.live,
    quality: values.quality,
    intervalSeconds: positiveInteger(values.interval, 1, "interval"),
  });

  let writes: Promise<void> = Promise.resolve();

  for await (const { t, frame } of frames) {
    const known = tracker.games.length;
    tracker.push(t, readScoreboard(frame, overlay));

    for (const game of tracker.games.slice(known)) {
      process.stderr.write(
        `Game ${game.number}: blue ${game.blue} - ${game.orange} orange (${game.endedBy}, ${game.endedAt}s, confidence ${game.confidence})\n`,
      );

      if (values.out !== undefined) {
        const { out } = values;
        const snapshot = tracker.proposal(source);
        const previous = writes;

        writes = (async () => {
          await previous;
          await writeProposal(snapshot, out);
        })();
      }
    }

    if (tracker.decided) {
      break;
    }
  }

  await writes;
  tracker.finish();
  const proposal = tracker.proposal(source);
  process.stderr.write(
    proposal.series.winner === null
      ? "No series winner was read. Check the proposal before using it.\n"
      : `Proposed series: blue ${proposal.series.blue} - ${proposal.series.orange} orange. Confirm it in the admin against the official post.\n`,
  );
  await writeProposal(proposal, values.out);
}

async function readSingleFrame(path: string): Promise<Frame> {
  const frames = readPpmFrames(createReadStream(path));
  const first = await frames.next();
  await frames.return(undefined);

  if (first.done === true) {
    throw new Error(`${path} holds no PPM frame.`);
  }

  return first.value;
}

function labelledTemplates(
  frame: Frame,
  overlay: Overlay,
  region: Region,
  text: string,
): GlyphTemplate[] {
  const grids = glyphGrids(frame, scaleRegion(region, overlay.reference, frame), {
    threshold: overlay.text.threshold,
    size: overlay.glyph,
  });

  if (grids.length !== text.length) {
    throw new Error(`Found ${grids.length} glyphs for "${text}". Adjust the region or threshold.`);
  }

  return grids.map((grid, index) => templateFromGrid(text.charAt(index), grid, overlay.glyph));
}

async function calibrate(args: readonly string[]): Promise<void> {
  const { values } = parseArgs({
    args: [...args],
    options: {
      overlay: { type: "string" },
      frame: { type: "string" },
      blue: { type: "string" },
      orange: { type: "string" },
      clock: { type: "string" },
    },
  });

  const overlay = await loadOverlay(required(values.overlay, "overlay"));
  const frame = await readSingleFrame(required(values.frame, "frame"));

  const learned = [
    ...labelledTemplates(frame, overlay, overlay.regions.blue, required(values.blue, "blue")),
    ...labelledTemplates(frame, overlay, overlay.regions.orange, required(values.orange, "orange")),
    ...labelledTemplates(frame, overlay, overlay.regions.clock, required(values.clock, "clock")),
  ];

  const known = new Set(overlay.templates.map((template) => JSON.stringify(template)));

  const templates = [
    ...overlay.templates,
    ...learned.filter((template) => !known.has(JSON.stringify(template))),
  ];

  process.stdout.write(`${JSON.stringify({ ...overlay, templates }, null, 2)}\n`);
}

async function main(argv: readonly string[]): Promise<void> {
  const [command, ...args] = argv;

  switch (command) {
    case "read": {
      await read(args);

      return;
    }

    case "calibrate": {
      await calibrate(args);

      return;
    }

    default: {
      throw new Error(USAGE);
    }
  }
}

try {
  await main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
