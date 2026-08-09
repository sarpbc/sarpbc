import { describe, expect, it } from "vitest";
import {
  COMMENT_HASH_PREFIX,
  commentAnchorId,
  commentPermalinkHash,
  parseCommentHash,
} from "./commentPermalink";

describe("commentPermalink", () => {
  it("builds stable anchor ids", () => {
    expect(commentAnchorId("abc-123")).toBe(`${COMMENT_HASH_PREFIX}abc-123`);
    expect(commentPermalinkHash("abc-123")).toBe(`#${COMMENT_HASH_PREFIX}abc-123`);
  });

  it("parses comment hashes", () => {
    expect(parseCommentHash("#comment-abc-123")).toBe("abc-123");
    expect(parseCommentHash("comment-abc-123")).toBe("abc-123");
    expect(parseCommentHash("#other")).toBeNull();
  });
});
