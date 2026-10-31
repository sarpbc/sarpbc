import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseNewsTweetTag, serializeNewsTweetTag, stripNewsTweetTags } from "./news-tweet-tag.ts";

const TWEET_URL = "https://x.com/RLEsports/status/1234567890";

function assertFast(run: () => unknown): void {
  const startedAt = performance.now();
  run();
  assert.ok(performance.now() - startedAt < 200);
}

describe("parseNewsTweetTag", () => {
  it("parses inline and block tags", () => {
    assert.deepEqual(parseNewsTweetTag(`:tweet{url="${TWEET_URL}"} after`), {
      url: TWEET_URL,
      parsed: { id: "1234567890", handle: "RLEsports", url: TWEET_URL },
      raw: `:tweet{url="${TWEET_URL}"}`,
    });
    assert.equal(
      parseNewsTweetTag(`::tweet{url="${TWEET_URL}"}\n::\nnext`)?.raw,
      `::tweet{url="${TWEET_URL}"}\n::`,
    );
  });

  it("uses the first url attribute after unescaping and trimming", () => {
    const parsed = parseNewsTweetTag(
      ':tweet{alt="x" url=" https://twitter.com/i/web/status/42 " url="https://x.com/a/status/1"}',
    );
    assert.equal(parsed?.url, "https://x.com/i/web/status/42");
    assert.equal(
      parseNewsTweetTag(serializeNewsTweetTag("https://mobile.twitter.com/Foo/status/7?s=20"))?.url,
      "https://x.com/Foo/status/7",
    );
  });

  it("rejects missing, malformed or non-tweet urls", () => {
    assert.equal(parseNewsTweetTag(":tweet{}"), null);
    assert.equal(parseNewsTweetTag(':tweet{url="https://example.com/status/1"}'), null);
    assert.equal(parseNewsTweetTag(`:tweet{url="${TWEET_URL}}`), null);
    assert.equal(parseNewsTweetTag(`:tweet{url="\\\n${TWEET_URL}"}`), null);
    assert.equal(parseNewsTweetTag(`text :tweet{url="${TWEET_URL}"}`), null);
  });

  it("handles pathological attribute input in linear time", () => {
    assertFast(() => assert.equal(parseNewsTweetTag(`:tweet{${"0".repeat(50_000)}}`), null));
  });
});

describe("stripNewsTweetTags", () => {
  it("replaces block and inline tags with a space", () => {
    assert.equal(
      stripNewsTweetTags(`Before\n\n::tweet{url="${TWEET_URL}"}\n::\n\nAfter`),
      "Before\n\n \n\nAfter",
    );
    assert.equal(stripNewsTweetTags(`a :tweet{url="${TWEET_URL}"} b`), "a   b");
    assert.equal(stripNewsTweetTags("a ::tweet{x}  \t\n\n ::b"), "a  b");
  });

  it("falls back to inline stripping when a block tag is not closed", () => {
    assert.equal(stripNewsTweetTags("::tweet{a} x ::"), ":  x ::");
    assert.equal(stripNewsTweetTags("::tweet{a ::tweet{b} ::}"), " }");
    assert.equal(stripNewsTweetTags("::tweet{a}::tweet{b}::"), " tweet{b}::");
  });

  it("leaves text without a closing brace untouched", () => {
    assert.equal(stripNewsTweetTags(":tweet{never closed"), ":tweet{never closed");
    assert.equal(stripNewsTweetTags("no tags here"), "no tags here");
  });

  it("handles pathological tag input in linear time", () => {
    const repeated = "::tweet{{".repeat(6_000);
    assertFast(() => assert.equal(stripNewsTweetTags(repeated), repeated));
    assertFast(() => stripNewsTweetTags(`${"::tweet{}x".repeat(5_000)}`));
    assertFast(() => stripNewsTweetTags(`::tweet{}${" ".repeat(50_000)}x`));
  });
});
