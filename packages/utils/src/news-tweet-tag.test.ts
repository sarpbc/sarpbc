import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseNewsTweetTag, serializeNewsTweetTag, stripNewsTweetTags } from "./news-tweet-tag";

const TWEET_URL = "https://x.com/RLEsports/status/1234567890";

void describe("parseNewsTweetTag", () => {
  void it("parses inline and block tags", () => {
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

  void it("uses the first url attribute after unescaping and trimming", () => {
    const parsed = parseNewsTweetTag(
      ':tweet{alt="x" url=" https://twitter.com/i/web/status/42 " url="https://x.com/a/status/1"}',
    );

    assert.equal(parsed?.url, "https://x.com/i/web/status/42");
    assert.equal(
      parseNewsTweetTag(serializeNewsTweetTag("https://mobile.twitter.com/Foo/status/7?s=20"))?.url,
      "https://x.com/Foo/status/7",
    );
  });

  void it("rejects missing, malformed or non-tweet urls", () => {
    assert.equal(parseNewsTweetTag(":tweet{}"), null);
    assert.equal(parseNewsTweetTag(':tweet{url="https://example.com/status/1"}'), null);
    assert.equal(parseNewsTweetTag(`:tweet{url="${TWEET_URL}}`), null);
    assert.equal(parseNewsTweetTag(`:tweet{url="\\\n${TWEET_URL}"}`), null);
    assert.equal(parseNewsTweetTag(`text :tweet{url="${TWEET_URL}"}`), null);
  });

  void it("rejects pathological attribute input without stalling", () => {
    assert.equal(parseNewsTweetTag(`:tweet{${"0".repeat(50_000)}}`), null);
  });
});

void describe("stripNewsTweetTags", () => {
  void it("replaces block and inline tags with a space", () => {
    assert.equal(
      stripNewsTweetTags(`Before\n\n::tweet{url="${TWEET_URL}"}\n::\n\nAfter`),
      "Before\n\n \n\nAfter",
    );
    assert.equal(stripNewsTweetTags(`a :tweet{url="${TWEET_URL}"} b`), "a   b");
    assert.equal(stripNewsTweetTags("a ::tweet{x}  \t\n\n ::b"), "a  b");
  });

  void it("still strips the tag when a block tag is not closed", () => {
    const stripped = stripNewsTweetTags("::tweet{a} x ::");
    assert.equal(stripped.includes("tweet{"), false);
    assert.equal(stripped.includes(" x "), true);
  });

  void it("leaves text without a closing brace untouched", () => {
    assert.equal(stripNewsTweetTags(":tweet{never closed"), ":tweet{never closed");
    assert.equal(stripNewsTweetTags("no tags here"), "no tags here");
  });

  void it("leaves pathological unclosed tags untouched without stalling", () => {
    const unclosed = "::tweet{".repeat(50_000);
    assert.equal(stripNewsTweetTags(unclosed), unclosed);
  });
});
