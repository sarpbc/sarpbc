import { forumPostSlug } from "@sarpbc/utils";
import { describe, expect, it } from "vitest";
import type { PostActivity, PostRecord, TopicRecord } from "../../application/models";
import { PostType } from "../../domain/post-type.enum";
import { postActivityResponse, postWithSlugResponse, topicResponse } from "./forum-response";

const post: PostRecord = {
  author: { id: "user-1", userName: "fan" },
  content: "Predictions here",
  createdAt: new Date("2026-01-02T03:04:05Z"),
  id: "post-1",
  postType: PostType.DISCUSSION,
  publicId: 42,
  title: "Who wins the Open?",
  topic: { id: "topic-1", title: "Rocket League" },
  translations: [
    {
      content: "Pronostics ici",
      createdAt: new Date("2026-01-02T03:04:06Z"),
      id: "translation-1",
      locale: "fr-FR",
      post: { id: "post-1" },
      title: "Qui gagne l'Open ?",
      updatedAt: null,
    },
  ],
  updatedAt: new Date("2026-01-03T03:04:05Z"),
};

const topic: TopicRecord = {
  createdAt: new Date("2026-01-01T00:00:00Z"),
  description: "General discussions",
  id: "topic-1",
  posts: [{ ...post, translations: [] }],
  title: "Rocket League",
  updatedAt: null,
};

const activity: PostActivity = {
  id: "post-1",
  lastActivity: new Date("2026-01-04T00:00:00Z"),
  messageCount: 3,
  publicId: 42,
  title: "Who wins the Open?",
};

describe("forum responses", () => {
  it("keeps the post list item JSON identical to the spread record", () => {
    const previous = { ...post, slug: forumPostSlug(post.title) };

    expect(JSON.stringify(postWithSlugResponse(post))).toBe(JSON.stringify(previous));
  });

  it("keeps the topic JSON identical to the record", () => {
    expect(JSON.stringify(topicResponse(topic))).toBe(JSON.stringify(topic));
  });

  it("keeps the recent activity JSON identical to the spread record", () => {
    const previous = { ...activity, slug: forumPostSlug(activity.title) };

    expect(postActivityResponse(activity)).toStrictEqual({
      ...previous,
      lastActivity: previous.lastActivity.toISOString(),
    });
  });
});
