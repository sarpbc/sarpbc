import { describe, expect, it } from "vitest";
import type { Comment } from "~/types/discussion";
import { findCommentInTree } from "./commentTree";

describe("findCommentInTree", () => {
  const comments: Comment[] = [
    {
      id: "root",
      content: "root",
      author: { id: "u1", userName: "fan" },
      createdAt: "2026-01-01",
      replies: [
        {
          id: "child",
          content: "child",
          author: { id: "u2", userName: "mod" },
          createdAt: "2026-01-02",
          replies: [],
        },
      ],
    },
  ];

  it("finds root and nested comments", () => {
    expect(findCommentInTree(comments, "root")).toBe(true);
    expect(findCommentInTree(comments, "child")).toBe(true);
    expect(findCommentInTree(comments, "missing")).toBe(false);
  });
});
