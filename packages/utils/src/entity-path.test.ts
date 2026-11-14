import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  localizedPath,
  newsPath,
  playerPath,
  stageMatchesPath,
  teamPath,
  tournamentStagePath,
} from "./entity-path";

void describe("entity paths", () => {
  void it("builds profile and news paths from slugs", () => {
    assert.equal(playerPath("zen"), "/player/zen");
    assert.equal(teamPath("vitality"), "/team/vitality");
    assert.equal(newsPath("rlcs-finals"), "/news/rlcs-finals");
  });

  void it("appends the matches tab to the stage path", () => {
    assert.equal(
      stageMatchesPath("rlcs-2026", "playoffs"),
      `${tournamentStagePath("rlcs-2026", "playoffs")}/matches`,
    );
  });

  void it("prefixes only the French locale", () => {
    assert.equal(localizedPath("/news/a", "en"), "/news/a");
    assert.equal(localizedPath("/news/a", "fr"), "/fr/news/a");
    assert.equal(localizedPath("/", "fr"), "/fr/");
  });
});
