import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countryCode } from "./country-code";

void describe("countryCode", () => {
  void it("normalises a stored nationality into an upper-case two-letter code", () => {
    assert.equal(countryCode(" fr "), "FR");
    assert.equal(countryCode("US"), "US");
  });

  void it("refuses values that are not a two-letter code", () => {
    assert.equal(countryCode(null), null);
    assert.equal(countryCode(""), null);
    assert.equal(countryCode("FRA"), null);
    assert.equal(countryCode("France"), null);
    assert.equal(countryCode("F1"), null);
  });
});
