import { forumPostSlug } from "@sarpbc/utils";
import { describe, expect, it } from "vitest";
import type { PostActivity, PostRecord, TopicRecord } from "../../application/models";
import { PostType } from "../../domain/post-type.enum";
import { postActivityResponse, postWithSlugResponse, topicResponse } from "./forum-response";

const post: PostRecord = {
  id: "post-1",
  publicId: 42,
  title: "Who wins the Open?",
  content: "Predictions here",
  author: { id: "user-1", userName: "fan" },
  topic: { id: "topic-1", title: "Rocket League" },
  postType: PostType.DISCUSSION,
  createdAt: new Date("2026-01-02T03:04:05Z"),
  updatedAt: new Date("2026-01-03T03:04:05Z"),
  translations: [
    {
      id: "translation-1",
      post: { id: "post-1" },
      locale: "fr-FR",
      title: "Qui gagne l'Open ?",
      content: "Pronostics ici",
      createdAt: new Date("2026-01-02T03:04:06Z"),
      updatedAt: null,
    },
  ],
};

const topic: TopicRecord = {
  id: "topic-1",
  title: "Rocket League",
  description: "General discussions",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: null,
  posts: [{ ...post, translations: [] }],
};

const activity: PostActivity = {
  id: "post-1",
  publicId: 42,
  title: "Who wins the Open?",
  messageCount: 3,
  lastActivity: new Date("2026-01-04T00:00:00Z"),
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

    expect(JSON.stringify(postActivityResponse(activity))).toBe(JSON.stringify(previous));
  });
});
