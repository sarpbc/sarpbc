import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isBlastSourceHost, isForbiddenSourceHost, isLiquipediaSourceHost } from "./source-host";

describe("isLiquipediaSourceHost", () => {
  it("matches Liquipedia and its mirrors", () => {
    for (const host of ["liquipedia.net", "LIQUIPEDIA.NET.", "liquipedia-mirror.example"])
      assert.equal(isLiquipediaSourceHost(host), true);
    assert.equal(isLiquipediaSourceHost("rocketleague.com"), false);
  });
});

describe("isBlastSourceHost", () => {
  it("matches BLAST.tv and its subdomains but not lookalikes", () => {
    for (const host of ["blast.tv", "www.BLAST.tv", "Rl.BLAST.tv."])
      assert.equal(isBlastSourceHost(host), true);
    for (const host of ["notblast.tv", "blast.tv.example"])
      assert.equal(isBlastSourceHost(host), false);
  });
});

describe("isForbiddenSourceHost", () => {
  it("refuses Liquipedia and BLAST.tv and accepts official sources", () => {
    for (const host of ["liquipedia.net", "www.blast.tv"])
      assert.equal(isForbiddenSourceHost(host), true);
    for (const host of ["rocketleague.com", "start.gg", "notblast.tv"])
      assert.equal(isForbiddenSourceHost(host), false);
  });
});
