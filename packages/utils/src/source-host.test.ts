import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isBlastSourceHost,
  isForbiddenSourceHost,
  isLiquipediaSourceHost,
  isStartggSourceHost,
} from "./source-host";

void describe("isLiquipediaSourceHost", () => {
  void it("matches Liquipedia and its mirrors", () => {
    for (const host of ["liquipedia.net", "LIQUIPEDIA.NET.", "liquipedia-mirror.example"]) {
      assert.equal(isLiquipediaSourceHost(host), true);
    }

    assert.equal(isLiquipediaSourceHost("rocketleague.com"), false);
  });
});

void describe("isBlastSourceHost", () => {
  void it("matches BLAST.tv and its subdomains but not lookalikes", () => {
    for (const host of ["blast.tv", "www.BLAST.tv", "Rl.BLAST.tv."]) {
      assert.equal(isBlastSourceHost(host), true);
    }

    for (const host of ["notblast.tv", "blast.tv.example"]) {
      assert.equal(isBlastSourceHost(host), false);
    }
  });
});

void describe("isStartggSourceHost", () => {
  void it("matches start.gg and its subdomains but not lookalikes", () => {
    for (const host of ["start.gg", "www.START.gg", "api.start.gg."]) {
      assert.equal(isStartggSourceHost(host), true);
    }

    for (const host of ["notstart.gg", "start.gg.example"]) {
      assert.equal(isStartggSourceHost(host), false);
    }
  });
});

void describe("isForbiddenSourceHost", () => {
  void it("refuses Liquipedia, BLAST.tv and start.gg and accepts official sources", () => {
    for (const host of ["liquipedia.net", "www.blast.tv", "www.start.gg"]) {
      assert.equal(isForbiddenSourceHost(host), true);
    }

    for (const host of ["rocketleague.com", "notstart.gg", "notblast.tv"]) {
      assert.equal(isForbiddenSourceHost(host), false);
    }
  });
});
