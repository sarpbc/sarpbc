import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MatchBlockSelector } from "@sarpbc/types";
import { newsContentToPlainText } from "./news-content";
import {
  extractNewsMatchBlocks,
  findInvalidNewsMatchTags,
  newsMatchBlockFromAttrs,
  newsMatchBlockKey,
  parseNewsMatchBlockKey,
  parseNewsMatchTag,
  serializeNewsMatchTag,
  stripNewsMatchTags,
} from "./news-match-block";

const MATCH = "0b8e7c62-4d0f-4c47-9a57-0e6a5c3d9f11";
const OTHER = "6f1d2b0a-93c4-4e8f-b7a2-5c1e8d4f0a22";
const TOURNAMENT = "a3c5e7f9-1b2d-4f6a-8c0e-2d4f6a8c0e33";
const TEAM = "c9e1a3b5-7d9f-4b1d-a3c5-e7f9b1d3f544";

void describe("parseNewsMatchTag", () => {
  void it("parses each selector", () => {
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

  void it("accepts the MDC block form and keeps the raw tag", () => {
    const raw = `::matches{match="${MATCH}"}\n::`;
    assert.equal(parseNewsMatchTag(`${raw}\n\nNext paragraph.`)?.raw, raw);
  });

  void it("rejects malformed tags", () => {
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

  void it("rejects attributes that MDC would read differently", () => {
    for (const raw of [
      `:matches{team="${TEAM}" limit=7}`,
      `:matches{match="${MATCH}" limit}`,
      `:matches{team='${TEAM}' limit='3'}`,
      `:matches{team="${TEAM}" :limit="3"}`,
      `:matches{team="${TEAM}" .wide}`,
      `:matches{team="${TEAM}" #scores}`,
      `:matches{team="${TEAM}"limit="3"}`,
      `:matches{team="${TEAM}" limit="3" limit="4"}`,
      `:matches{team="${TEAM}" limit="0x5"}`,
      `:matches{team="${TEAM}" limit="1e1"}`,
      `:matches{team="${TEAM}" limit="05"}`,
      `:matches{team="${TEAM}" limit="+5"}`,
    ]) {
      assert.equal(parseNewsMatchTag(raw), null, raw);
    }
  });

  void it("rejects component limits that are not plain positive integers", () => {
    for (const limit of ["5.0", "true"]) {
      assert.equal(newsMatchBlockFromAttrs({ team: TEAM, limit }), null, limit);
    }
  });

  void it("accepts the MDC block form with Windows line endings", () => {
    const raw = `::matches{match="${MATCH}"}\r\n::`;
    assert.equal(parseNewsMatchTag(raw)?.raw, raw);
  });
});

void describe("serializeNewsMatchTag", () => {
  const match: MatchBlockSelector = { kind: "match", id: MATCH };
  const ids: MatchBlockSelector = { kind: "matches", ids: [OTHER, MATCH] };
  const tournament: MatchBlockSelector = { kind: "tournament", id: TOURNAMENT, limit: 8 };
  const team: MatchBlockSelector = { kind: "team", id: TEAM, limit: 5 };

  void it("writes canonical tags", () => {
    assert.equal(serializeNewsMatchTag(match), `:matches{match="${MATCH}"}`);
    assert.equal(serializeNewsMatchTag(ids), `:matches{ids="${OTHER},${MATCH}"}`);
    assert.equal(
      serializeNewsMatchTag(tournament),
      `:matches{tournament="${TOURNAMENT}" limit="8"}`,
    );
  });

  void it("round-trips through the parser and the batch key", () => {
    for (const block of [match, ids, tournament, team]) {
      assert.deepEqual(parseNewsMatchTag(serializeNewsMatchTag(block))?.block, block);
      assert.deepEqual(parseNewsMatchBlockKey(newsMatchBlockKey(block)), block);
    }
  });
});

void describe("parseNewsMatchBlockKey", () => {
  void it("rejects keys that are not canonical", () => {
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

void describe("newsMatchBlockFromAttrs", () => {
  void it("reads MDC props, including numeric limits", () => {
    assert.deepEqual(newsMatchBlockFromAttrs({ team: TEAM, limit: 7 }), {
      kind: "team",
      id: TEAM,
      limit: 7,
    });
    assert.equal(newsMatchBlockFromAttrs({ match: "", ids: "" }), null);
  });
});

void describe("article content", () => {
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

  void it("extracts valid blocks once each", () => {
    assert.deepEqual(extractNewsMatchBlocks(content).map(newsMatchBlockKey), [
      `match:${MATCH}`,
      `tournament:${TOURNAMENT}:3`,
    ]);
  });

  void it("reports invalid tags", () => {
    assert.deepEqual(findInvalidNewsMatchTags(content), [':matches{team="falcons"}']);
  });

  void it("requires each block on its own line", () => {
    const tag = `:matches{match="${MATCH}"}`;
    assert.deepEqual(findInvalidNewsMatchTags(`Watch ${tag} live.`), [tag]);
    assert.deepEqual(findInvalidNewsMatchTags(`- ${tag}`), [tag]);
    assert.deepEqual(findInvalidNewsMatchTags(`${tag}${tag}`), [tag, tag]);
    assert.deepEqual(extractNewsMatchBlocks(`Watch ${tag} live.`), []);
    assert.deepEqual(findInvalidNewsMatchTags(`Bracket:\n  ${tag}  \nNext.`), []);
    assert.deepEqual(findInvalidNewsMatchTags(`Bracket:\n    ${tag}\nNext.`), [tag]);
    assert.deepEqual(findInvalidNewsMatchTags(`Bracket:\n\t${tag}\nNext.`), [tag]);
    assert.deepEqual(findInvalidNewsMatchTags(`> ${tag}`), [tag]);
  });

  void it("ignores tags written as code", () => {
    const documented = [
      'Write `:matches{team="<team id>"}` or `` :matches{} `` on its own line.',
      "",
      "```md",
      ':matches{team="<team id>" limit="5"}',
      "```",
      "",
      "~~~~",
      ":matches{}",
      "~~~~",
    ].join("\n");

    assert.deepEqual(findInvalidNewsMatchTags(documented), []);
    assert.deepEqual(extractNewsMatchBlocks(documented), []);
    assert.deepEqual(findInvalidNewsMatchTags(`\`code\` :matches{match="${MATCH}"}`), [
      `:matches{match="${MATCH}"}`,
    ]);
  });

  void it("drops match blocks from plain text", () => {
    assert.equal(
      newsContentToPlainText(content),
      "Falcons opened the event. They play again tomorrow.",
    );
  });
});

const assertFast = (content: string) => {
  assert.deepEqual(extractNewsMatchBlocks(content), []);
  assert.equal(parseNewsMatchTag(content), null);
  findInvalidNewsMatchTags(content);
  stripNewsMatchTags(content);
};

void describe("hostile content", () => {
  void it("scans a block tag followed by whitespace in linear time", () => {
    assertFast(`::matches{}${" ".repeat(200_000)}`);
    assertFast(`::matches{}${" \t".repeat(100_000)}x`);
  });

  void it("scans unterminated and repeated tags in linear time", () => {
    assertFast("::matches{".repeat(50_000));
    assertFast(`::matches{${"a".repeat(200_000)}`);
    assertFast(`:matches{${'a="b" '.repeat(40_000)}}`);
    assertFast(`:matches{${"0".repeat(200_000)}}`);
    assertFast(`:matches{${"0".repeat(200_000)}="1"}`);
  });

  void it("scans backtick runs in linear time", () => {
    assertFast("`".repeat(200_000));
    assertFast("`a".repeat(100_000));
    assertFast(Array.from({ length: 600 }, (_, index) => "`".repeat(index + 1)).join(" "));
  });
});
