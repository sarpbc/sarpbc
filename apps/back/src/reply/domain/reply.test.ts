import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import {
  replySortOrder,
  replyTarget,
  resolveReplyTargetLink,
  sameReplyTarget,
  type ReplyTargetFields,
} from "./reply";

function makeReply(partial: Partial<ReplyTargetFields>): ReplyTargetFields {
  return {
    post: null,
    newsArticle: null,
    match: null,
    ...partial,
  };
}

describe("resolveReplyTargetLink", () => {
  it("resolves forum post targets", () => {
    const reply = makeReply({
      post: { id: "post-1", publicId: 88, title: "Thread title: Who wins?" },
    });

    expect(resolveReplyTargetLink(reply)).toEqual({
      targetType: "forumPost",
      targetId: "post-1",
      targetLabel: "Thread title: Who wins?",
      targetPath: "/forum/post/88/thread-title-who-wins",
    });
  });

  it("resolves news article targets", () => {
    const reply = makeReply({
      newsArticle: { id: "news-1", slug: "rlcs-finals", title: "RLCS Finals" },
    });

    expect(resolveReplyTargetLink(reply)).toEqual({
      targetType: "newsArticle",
      targetId: "news-1",
      targetLabel: "RLCS Finals",
      targetPath: "/news/rlcs-finals",
    });
  });

  it("resolves match targets", () => {
    const reply = makeReply({
      match: {
        id: "match-1",
        publicId: 7250,
        name: "Team A vs Team B",
        slug: "team-a-vs-team-b-rlcs-open-2026",
      },
    });

    expect(resolveReplyTargetLink(reply)).toEqual({
      targetType: "match",
      targetId: "match-1",
      targetLabel: "Team A vs Team B",
      targetPath: "/matches/7250/team-a-vs-team-b-rlcs-open-2026",
    });
  });

  it("returns null for orphan replies", () => {
    expect(resolveReplyTargetLink(makeReply({}))).toBeNull();
  });
});

describe("replyTarget", () => {
  it.each([
    [{ postId: "p" }, { kind: "forumPost", id: "p" }],
    [{ newsArticleId: "n" }, { kind: "newsArticle", id: "n" }],
    [{ matchId: "m" }, { kind: "match", id: "m" }],
  ])("reads the single target of %j", (input, expected) => {
    expect(replyTarget(input)).toEqual(expected);
  });

  it.each([{}, { postId: "p", matchId: "m" }])("rejects %j", (input) => {
    expect(() => replyTarget(input)).toThrow(InvalidInputError);
  });
});

const post = (id: string) => makeReply({ post: { id, publicId: 1, title: "T" } });

describe("sameReplyTarget", () => {
  it("matches replies on the same target", () => {
    expect(sameReplyTarget(post("p1"), post("p1"))).toBe(true);
  });

  it("rejects replies on different targets", () => {
    expect(sameReplyTarget(post("p1"), post("p2"))).toBe(false);
    expect(
      sameReplyTarget(post("p1"), makeReply({ newsArticle: { id: "p1", title: "T", slug: "t" } })),
    ).toBe(false);
  });
});

describe("replySortOrder", () => {
  it("lists forum discussions oldest first and the other targets newest first", () => {
    expect(replySortOrder("forumPost")).toBe("asc");
    expect(replySortOrder("newsArticle")).toBe("desc");
    expect(replySortOrder("match")).toBe("desc");
  });
});
