import { describe, expect, it } from "vitest";
import { resolveReplyTargetLink, type ReplyTargetSource as Reply } from "./reply-target-link.util";

function makeReply(partial: Partial<Reply>): Reply {
  return {
    post: null,
    newsArticle: null,
    match: null,
    ...partial,
  } as Reply;
}

describe("resolveReplyTargetLink", () => {
  it("resolves forum post targets", () => {
    const reply = makeReply({
      post: { id: "post-1", publicId: 88, title: "Thread title: Who wins?" } as never,
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
      newsArticle: { id: "news-1", slug: "rlcs-finals", title: "RLCS Finals" } as never,
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
      } as never,
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
