import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { OVERLAY_PATH } from "../fixtures/accuracy.ts";
import { FixtureRenderer } from "../fixtures/render.ts";
import { parseOverlay } from "./overlay.ts";

const run = promisify(execFile);
const CLI = fileURLToPath(new URL("./cli.ts", import.meta.url));

async function cli(args: readonly string[]): Promise<{ stdout: string; stderr: string }> {
  return await run(process.execPath, [
    "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
    CLI,
    ...args,
  ]);
}

void describe("stream-score-ocr cli", () => {
  let directory = "";
  before(async () => {
    directory = await mkdtemp(join(tmpdir(), "stream-score-ocr-"));
  });
  after(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  void it("learns glyph templates from a labelled frame", async () => {
    const overlay = parseOverlay(await readFile(OVERLAY_PATH, "utf8"));
    const partial = join(directory, "overlay.json");
    await writeFile(
      partial,
      JSON.stringify({
        ...overlay,
        templates: overlay.templates.filter((template) => template.char === "0"),
      }),
    );

    const frame = new FixtureRenderer({ width: 1280, height: 720 }, 5).render(
      {
        kind: "scorebug",
        blue: 7,
        orange: 4,
        clock: 92,
        overtime: true,
        replay: false,
        fade: 1,
        glitch: false,
      },
      6,
    );

    const ppm = join(directory, "frame.ppm");
    await writeFile(
      ppm,
      Buffer.concat([Buffer.from(`P6\n${frame.width} ${frame.height}\n255\n`), frame.data]),
    );

    const { stdout } = await cli([
      "calibrate",
      "--overlay",
      partial,
      "--frame",
      ppm,
      "--blue",
      "7",
      "--orange",
      "4",
      "--clock",
      "+1:32",
    ]);

    const learned = parseOverlay(stdout);
    assert.deepEqual(
      [...new Set(learned.templates.map((template) => template.char))].sort(),
      ["+", "0", "1", "2", "3", "4", "7", ":"].sort(),
    );
  });

  void it("refuses a calibration label that does not match the glyphs on screen", async () => {
    await assert.rejects(
      cli([
        "calibrate",
        "--overlay",
        OVERLAY_PATH,
        "--frame",
        join(directory, "frame.ppm"),
        "--blue",
        "17",
        "--orange",
        "4",
        "--clock",
        "+1:32",
      ]),
      /Found 1 glyphs for "17"/,
    );
  });

  void it("explains its usage when an argument is missing", async () => {
    await assert.rejects(cli(["read", "--overlay", OVERLAY_PATH]), /--input is required/);
    await assert.rejects(cli(["unknown"]), /Usage:/);
  });
});
