import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import type { ParsedReplay, ReplayParser } from "../../application/ports";

const run = promisify(execFile);
const TIMEOUT_MS = 60_000;
const MAX_OUTPUT_BYTES = 1024 * 1024;

const count = z.number().int().nonnegative();
const parserOutput = z.object({
  blueGoals: count,
  orangeGoals: count,
  players: z.array(
    z.object({
      name: z.string(),
      platform: z.string(),
      platformId: z.string().nullable(),
      team: z.union([z.literal(0), z.literal(1)]),
      goals: count,
      assists: count,
      saves: count,
      shots: count,
      demolitions: count,
    }),
  ),
});

export function parseParserOutput(stdout: string): ParsedReplay {
  const parsed = parserOutput.parse(JSON.parse(stdout));
  return {
    blueGoals: parsed.blueGoals,
    orangeGoals: parsed.orangeGoals,
    players: parsed.players.map(({ team, ...player }) => ({
      ...player,
      side: team === 0 ? "blue" : "orange",
    })),
  };
}

/** Runs the `replay-parser` binary (apps/back/replay-parser) out of process so a parser crash cannot take the API down. */
export class BoxcarsReplayParser implements ReplayParser {
  constructor(private readonly binary: string) {}

  async parse(file: Uint8Array): Promise<ParsedReplay> {
    const directory = await mkdtemp(path.join(tmpdir(), "sarpbc-replay-"));
    try {
      const replayPath = path.join(directory, "game.replay");
      await writeFile(replayPath, file);
      const { stdout } = await run(this.binary, [replayPath], {
        timeout: TIMEOUT_MS,
        maxBuffer: MAX_OUTPUT_BYTES,
        windowsHide: true,
      });
      return parseParserOutput(stdout);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}
