import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { newsContentToPlainText } from "./news-content.ts";
import {
  extractNewsMatchBlocks,
  findInvalidNewsMatchTags,
  newsMatchBlockFromAttrs,
  newsMatchBlockKey,
  parseNewsMatchBlockKey,
  parseNewsMatchTag,
  serializeNewsMatchTag,
  type NewsMatchBlock,
} from "./news-match-block.ts";

const MATCH = "0b8e7c62-4d0f-4c47-9a57-0e6a5c3d9f11";
const OTHER = "6f1d2b0a-93c4-4e8f-b7a2-5c1e8d4f0a22";
const TOURNAMENT = "a3c5e7f9-1b2d-4f6a-8c0e-2d4f6a8c0e33";
const TEAM = "c9e1a3b5-7d9f-4b1d-a3c5-e7f9b1d3f544";

describe("parseNewsMatchTag", () => {
  it("parses each selector", () => {
    assert.deepEqual(parseNewsMatchTag(`:matches{match="${MATCH}"}`)?.block, {
      kind: "match",
      id: MATCH,
    });
    assert.deepEqual(parseNewsMatchTag(`:matches{ids="${MATCH}, ${OTHER}"}`)?.block, {
      kind: "matches",
      ids: [MATCH, OTHER],
    });
    assert.deepEqual(parseNewsMatchTag(`:matches{tournament="${TOURNAMENT}" limit="3"}`)?.block, {
      kind: "tournament",
      id: TOURNAMENT,
      limit: 3,
    });
    assert.deepEqual(parseNewsMatchTag(`:matches{team="${TEAM.toUpperCase()}"}`)?.block, {
      kind: "team",
      id: TEAM,
      limit: 5,
    });
  });

  it("accepts the MDC block form and keeps the raw tag", () => {
    const raw = `::matches{match="${MATCH}"}\n::`;
    assert.equal(parseNewsMatchTag(`${raw}\n\nNext paragraph.`)?.raw, raw);
  });

  it("rejects malformed tags", () => {
    for (const raw of [
      ":matches{}",
      `:matches{match="${MATCH}" team="${TEAM}"}`,
      ':matches{match="not-a-uuid"}',
      `:matches{match="${MATCH}" limit="3"}`,
      `:matches{ids="${MATCH},${MATCH}"}`,
      `:matches{ids="${Array.from({ length: 11 }, () => MATCH).join(",")}"}`,
      `:matches{team="${TEAM}" limit="0"}`,
      `:matches{team="${TEAM}" limit="11"}`,
      `:matches{tournament="${TOURNAMENT}" limit="2.5"}`,
      `:matches{tournament="${TOURNAMENT}" sort="desc"}`,
      `:match{match="${MATCH}"}`,
    ]) {
      assert.equal(parseNewsMatchTag(raw), null, raw);
    }
  });
});

describe("serializeNewsMatchTag", () => {
  const blocks: NewsMatchBlock[] = [
    { kind: "match", id: MATCH },
    { kind: "matches", ids: [OTHER, MATCH] },
    { kind: "tournament", id: TOURNAMENT, limit: 8 },
    { kind: "team", id: TEAM, limit: 5 },
  ];

  it("writes canonical tags", () => {
    assert.equal(serializeNewsMatchTag(blocks[0]!), `:matches{match="${MATCH}"}`);
    assert.equal(serializeNewsMatchTag(blocks[1]!), `:matches{ids="${OTHER},${MATCH}"}`);
    assert.equal(
      serializeNewsMatchTag(blocks[2]!),
      `:matches{tournament="${TOURNAMENT}" limit="8"}`,
    );
  });

  it("round-trips through the parser and the batch key", () => {
    for (const block of blocks) {
      assert.deepEqual(parseNewsMatchTag(serializeNewsMatchTag(block))?.block, block);
      assert.deepEqual(parseNewsMatchBlockKey(newsMatchBlockKey(block)), block);
    }
  });
});

describe("parseNewsMatchBlockKey", () => {
  it("rejects keys that are not canonical", () => {
    for (const key of [
      `match:${MATCH}:5`,
      `tournament:${TOURNAMENT}`,
      `team:${TEAM}:5:1`,
      `match:${MATCH.toUpperCase()}`,
      `matches:${MATCH}, ${OTHER}`,
      `player:${MATCH}`,
    ]) {
      assert.equal(parseNewsMatchBlockKey(key), null, key);
    }
  });
});

describe("newsMatchBlockFromAttrs", () => {
  it("reads MDC props, including numeric limits", () => {
    assert.deepEqual(newsMatchBlockFromAttrs({ team: TEAM, limit: 7 }), {
      kind: "team",
      id: TEAM,
      limit: 7,
    });
    assert.equal(newsMatchBlockFromAttrs({ match: "", ids: "" }), null);
  });
});

describe("article content", () => {
  const content = [
    "Falcons opened the event.",
    "",
    `:matches{match="${MATCH}"}`,
    "",
    `::matches{tournament="${TOURNAMENT}" limit="3"}`,
    "::",
    "",
    `:matches{match="${MATCH}"}`,
    ':matches{team="falcons"}',
    "",
    "They play again tomorrow.",
  ].join("\n");

  it("extracts valid blocks once each", () => {
    assert.deepEqual(extractNewsMatchBlocks(content).map(newsMatchBlockKey), [
      `match:${MATCH}`,
      `tournament:${TOURNAMENT}:3`,
    ]);
  });

  it("reports invalid tags", () => {
    assert.deepEqual(findInvalidNewsMatchTags(content), [':matches{team="falcons"}']);
  });

  it("drops match blocks from plain text", () => {
    assert.equal(
      newsContentToPlainText(content),
      "Falcons opened the event. They play again tomorrow.",
    );
  });
});
