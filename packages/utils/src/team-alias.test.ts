import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TeamAliasInput } from "@sarpbc/types";
import { parseTeamAlias, teamAliasInForce, teamAliasesOverlap } from "./team-alias";

const VALID: TeamAliasInput = {
  name: " Fixture Esports ",
  from: "2024-01-15",
  to: "2025-03-01",
  sourceUrl: " https://x.com/fixture/status/1 ",
  logoUrl: null,
  pandascoreId: null,
};

void describe("parseTeamAlias", () => {
  void it("trims the name and normalizes the source URL", () => {
    assert.deepEqual(parseTeamAlias(VALID), {
      ok: true,
      alias: { ...VALID, name: "Fixture Esports", sourceUrl: "https://x.com/fixture/status/1" },
    });
    assert.equal(parseTeamAlias({ ...VALID, to: null, pandascoreId: 42 }).ok, true);
  });

  void it("refuses Liquipedia and its mirrors as a source or a logo", () => {
    const error = (input: Partial<TeamAliasInput>) => {
      const parsed = parseTeamAlias({ ...VALID, ...input });

      return parsed.ok ? null : parsed.error;
    };

    assert.equal(error({ sourceUrl: "https://liquipedia.net/rocketleague/X" }), "forbidden-source");
    assert.equal(error({ sourceUrl: "https://www.liquipedia.org/x" }), "forbidden-source");
    assert.equal(error({ sourceUrl: "https://liquipedia-mirror.example/x" }), "forbidden-source");
    assert.equal(error({ sourceUrl: "https://blast.tv/rl/teams/x" }), "forbidden-source");
    assert.equal(
      error({ logoUrl: "https://liquipedia.net/commons/images/logo.png" }),
      "forbidden-logo-source",
    );
    assert.equal(error({ logoUrl: "http://cdn.example/logo.png" }), "invalid-logo-url");
    assert.equal(error({ sourceUrl: "ftp://example.com" }), "invalid-source-url");
  });

  void it("checks the name, the dates and the PandaScore id", () => {
    const error = (input: Partial<TeamAliasInput>) => {
      const parsed = parseTeamAlias({ ...VALID, ...input });

      return parsed.ok ? null : parsed.error;
    };

    assert.equal(error({ name: "  " }), "missing-name");
    assert.equal(error({ from: "2024-02-30" }), "invalid-from");
    assert.equal(error({ from: "2024-13-40" }), "invalid-from");
    assert.equal(error({ to: "soon" }), "invalid-to");
    assert.equal(error({ to: "2024-01-15" }), "to-not-after-from");
    assert.equal(error({ pandascoreId: 0 }), "invalid-pandascore-id");
  });
});

void describe("teamAliasInForce", () => {
  const aliases = [
    { name: "First", from: "2020-01-01", to: "2022-06-01" },
    { name: "Second", from: "2022-06-01", to: null },
  ];

  void it("picks the alias whose period holds the day, the end day excluded", () => {
    assert.equal(teamAliasInForce(aliases, "2019-12-31"), null);
    assert.equal(teamAliasInForce(aliases, "2020-01-01")?.name, "First");
    assert.equal(teamAliasInForce(aliases, "2022-05-31")?.name, "First");
    assert.equal(teamAliasInForce(aliases, "2022-06-01")?.name, "Second");
    assert.equal(teamAliasInForce(aliases, "2030-01-01")?.name, "Second");
  });

  void it("detects overlapping periods", () => {
    assert.equal(teamAliasesOverlap(aliases[0], aliases[1]), false);
    assert.equal(teamAliasesOverlap(aliases[1], { from: "2023-01-01", to: "2023-02-01" }), true);
    assert.equal(teamAliasesOverlap(aliases[0], { from: "2019-01-01", to: "2020-01-02" }), true);
  });
});
