import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseNewsEntityTag, serializeNewsEntityTag } from "./news-entity-tag";

void describe("parseNewsEntityTag", () => {
  void it("parses player and team tags", () => {
    assert.deepEqual(parseNewsEntityTag(':player{slug="jstn" label="JSTN"} rest'), {
      kind: "player",
      label: "JSTN",
      raw: ':player{slug="jstn" label="JSTN"}',
      slug: "jstn",
    });
    assert.deepEqual(parseNewsEntityTag(':team{label=" Karmine Corp " slug="kc"}'), {
      kind: "team",
      label: "Karmine Corp",
      raw: ':team{label=" Karmine Corp " slug="kc"}',
      slug: "kc",
    });
  });

  void it("round-trips escaped quotes and backslashes", () => {
    const raw = serializeNewsEntityTag({ kind: "player", label: 'say "hi"', slug: "a\\b" });
    assert.equal(raw, ':player{slug="a\\\\b" label="say \\"hi\\""}');
    assert.deepEqual(parseNewsEntityTag(raw), {
      kind: "player",
      label: 'say "hi"',
      raw,
      slug: "a\\b",
    });
  });

  void it("keeps the last duplicate attribute and ignores unknown or malformed ones", () => {
    assert.deepEqual(
      parseNewsEntityTag(':player{x="1" slug="old" slug="new" label=unquoted label="L"}'),
      {
        kind: "player",
        label: "L",
        raw: ':player{x="1" slug="old" slug="new" label=unquoted label="L"}',
        slug: "new",
      },
    );
    assert.deepEqual(parseNewsEntityTag(':player{label="a\\\nb" slug="s" label="ok"}'), {
      kind: "player",
      label: "ok",
      raw: ':player{label="a\\\nb" slug="s" label="ok"}',
      slug: "s",
    });
  });

  void it("rejects tags without a slug or label", () => {
    assert.equal(parseNewsEntityTag(':player{slug="jstn"}'), null);
    assert.equal(parseNewsEntityTag(':player{slug=" " label="x"}'), null);
    assert.equal(parseNewsEntityTag(':coach{slug="a" label="b"}'), null);
    assert.equal(parseNewsEntityTag(':player{slug="a label="b"'), null);
  });

  void it("rejects pathological attribute input without stalling", () => {
    assert.equal(parseNewsEntityTag(`:player{${"a".repeat(50_000)}}`), null);
    assert.equal(parseNewsEntityTag(`:player{a="${"x".repeat(50_000)}\\\n}`), null);
  });
});
