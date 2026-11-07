import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseLocale, uiLocale } from "./locale";

describe("locale codes", () => {
  it("reads any French code, in any case, as fr-FR", () => {
    assert.equal(parseLocale("fr"), "fr-FR");
    assert.equal(parseLocale("fr-FR"), "fr-FR");
    assert.equal(parseLocale("FR-fr"), "fr-FR");
    assert.equal(parseLocale(" fr-CA,fr;q=0.9"), "fr-FR");
  });

  it("defaults omitted and other codes to en-US", () => {
    assert.equal(parseLocale(undefined), "en-US");
    assert.equal(parseLocale(null), "en-US");
    assert.equal(parseLocale("en"), "en-US");
    assert.equal(parseLocale("de"), "en-US");
  });

  it("narrows a code to the UI locales", () => {
    assert.equal(uiLocale("fr"), "fr");
    assert.equal(uiLocale("fr-FR"), "fr");
    assert.equal(uiLocale("en-US"), "en");
    assert.equal(uiLocale("de"), "en");
  });
});
