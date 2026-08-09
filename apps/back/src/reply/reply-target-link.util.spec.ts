import { resolveReplyTargetLink } from "./reply-target-link.util";
import type { Reply } from "../forum/forum.entities";

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
      post: { id: "post-1", title: "Thread title" } as never,
    });

    expect(resolveReplyTargetLink(reply)).toEqual({
      targetType: "forumPost",
      targetId: "post-1",
      targetLabel: "Thread title",
      targetPath: "/forum/post/post-1",
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
      match: { id: "match-1", name: "Team A vs Team B" } as never,
    });

    expect(resolveReplyTargetLink(reply)).toEqual({
      targetType: "match",
      targetId: "match-1",
      targetLabel: "Team A vs Team B",
      targetPath: "/matches/match-1",
    });
  });

  it("returns null for orphan replies", () => {
    expect(resolveReplyTargetLink(makeReply({}))).toBeNull();
  });
});
