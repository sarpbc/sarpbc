import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BoxcarsReplayParser, parseParserOutput } from "./boxcars-replay-parser";

const crate = path.resolve(__dirname, "../../../../replay-parser");
const binary = path.join(
  crate,
  "target/release",
  process.platform === "win32" ? "replay-parser.exe" : "replay-parser",
);
const fixture = path.join(crate, "tests/fixtures/soccar-strike-3v3.replay");

describe("parseParserOutput", () => {
  it("maps the parser team index to a side", () => {
    expect(
      parseParserOutput(
        JSON.stringify({
          replayGuid: "G",
          playedAt: null,
          teamSize: 1,
          blueGoals: 1,
          orangeGoals: 0,
          players: [
            {
              name: "A",
              platform: "epic",
              platformId: null,
              team: 1,
              goals: 0,
              assists: 0,
              saves: 2,
              shots: 1,
              demolitions: 3,
            },
          ],
        }),
      ),
    ).toEqual({
      blueGoals: 1,
      orangeGoals: 0,
      players: [
        {
          name: "A",
          platform: "epic",
          platformId: null,
          side: "orange",
          goals: 0,
          assists: 0,
          saves: 2,
          shots: 1,
          demolitions: 3,
        },
      ],
    });
  });

  it("rejects output that breaks the contract", () => {
    expect(() => parseParserOutput('{"blueGoals":-1,"orangeGoals":0,"players":[]}')).toThrow();
    expect(() =>
      parseParserOutput('{"blueGoals":0,"orangeGoals":0,"players":[{"name":"A","team":2}]}'),
    ).toThrow();
    expect(() => parseParserOutput("replay-parser: not json")).toThrow();
  });
});

describe("BoxcarsReplayParser", () => {
  it("fails when the binary cannot run", async () => {
    await expect(
      new BoxcarsReplayParser(path.join(crate, "missing-binary")).parse(new Uint8Array([1])),
    ).rejects.toThrow();
  });

  // CI builds the binary before the backend tests; run `cargo build --release` in replay-parser locally.
  it.skipIf(!existsSync(binary))("reads all five stats from a real replay", async () => {
    const parsed = await new BoxcarsReplayParser(binary).parse(await readFile(fixture));

    expect(parsed.blueGoals).toBe(4);
    expect(parsed.orangeGoals).toBe(2);
    expect(
      Object.fromEntries(
        parsed.players.map((p) => [
          p.name,
          [p.side, p.goals, p.assists, p.saves, p.shots, p.demolitions].join(" "),
        ]),
      ),
    ).toEqual({
      brandonsavagexx: "blue 1 2 1 2 0",
      "Trafalger Law.": "blue 2 0 0 5 1",
      Filthyx96: "blue 1 0 0 3 0",
      "Palantir FreedomRouter Pro": "orange 0 1 0 0 0",
      Beezyhere: "orange 1 0 2 2 2",
      JonaOrozco17: "orange 1 0 3 0 1",
    });
  });

  it.skipIf(!existsSync(binary))("rejects a file that is not a replay", async () => {
    await expect(
      new BoxcarsReplayParser(binary).parse(new TextEncoder().encode("not a replay")),
    ).rejects.toThrow();
  });
});
