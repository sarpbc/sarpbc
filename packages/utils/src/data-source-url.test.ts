import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAcceptedDataSourceUrl, isForbiddenDataSourceHost } from "./data-source-url";

describe("isAcceptedDataSourceUrl", () => {
  it("accepts an official http(s) page", () => {
    assert.equal(isAcceptedDataSourceUrl("https://www.rocketleague.com/en/news/rules"), true);
  });

  for (const url of [
    "https://blast.tv/rl/tournaments/open",
    "https://www.blast.tv/rl",
    "https://liquipedia.net/rocketleague/RLCS",
    "ftp://example.com/rules",
    "https://user:pass@example.com/rules",
    "not a url",
    `https://example.com/${"a".repeat(2048)}`,
  ]) {
    it(`refuses ${url.slice(0, 60)}`, () => {
      assert.equal(isAcceptedDataSourceUrl(url), false);
    });
  }
});

describe("isForbiddenDataSourceHost", () => {
  it("matches BLAST.tv subdomains with a trailing dot but not lookalikes", () => {
    assert.equal(isForbiddenDataSourceHost("Rl.BLAST.tv."), true);
    assert.equal(isForbiddenDataSourceHost("notblast.tv"), false);
  });
});
