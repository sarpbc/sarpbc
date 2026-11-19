import { describe, expect, it } from "vitest";
import { PostService } from "./post.service";
import { InMemoryForumScope } from "./forum-store.test-utils";
import type { PostRecord, TopicRecord } from "./models";
import type { Author } from "../../common/domain/author";
import { PostType } from "../domain/post-type.enum";

const now = new Date("2026-10-15T12:00:00Z");

const setup = (role: Author["role"] = "admin") => {
  const topic: TopicRecord = {
    createdAt: now,
    description: null,
    id: "topic",
    posts: [],
    title: "Topic",
    updatedAt: null,
  };

  const scope = new InMemoryForumScope();
  scope.topics.add(topic);
  scope.addUser({ id: "user", role, userName: "Fan" });

  return {
    scope,
    service: new PostService(
      scope.posts,
      scope,
      () => now,
      () => "translation",
    ),
  };
};

const latestPost = (createdAt: Date) =>
  ({
    author: { id: "user", userName: "Fan" },
    content: "Body",
    createdAt,
    id: "latest",
    postType: PostType.DISCUSSION,
    publicId: 1,
    title: "Post",
    topic: { id: "topic", title: "Topic" },
    translations: [],
    updatedAt: null,
  }) satisfies PostRecord;

const input = {
  content: "<script>bad()</script>Body",
  id: "post",
  title: "<b>Title</b>",
  topicId: "topic",
  translations: [{ content: "Corps", locale: "fr-FR" as const, title: "<b>Titre</b>" }],
};

describe("post transaction and policies", () => {
  it("creates the post and sanitized admin translations before a single commit", async () => {
    const f = setup();
    await expect(f.service.create("user", input)).resolves.toStrictEqual({
      publicId: 41,
      slug: "title",
    });
    expect(f.scope.posts.saved[0]?.title).toBe("Title");
    expect(f.scope.posts.translations[0]?.title).toBe("Titre");
    expect(f.scope.posts.translations[0]?.post.id).toBe("post");
    expect(f.scope.commits).toBe(1);
  });

  it("ignores translations from non-admin authors", async () => {
    const f = setup(null);
    await f.service.create("user", input);
    expect(f.scope.posts.saved).toHaveLength(1);
    expect(f.scope.posts.translations).toStrictEqual([]);
  });

  it("does not commit a post if a translation fails", async () => {
    const f = setup();
    f.scope.posts.failTranslationsWith(new Error("translation failed"));

    await expect(f.service.create("user", input)).rejects.toThrow("translation failed");
    expect(f.scope.commits).toBe(0);
  });

  it("reports the next available time until the one-hour boundary", async () => {
    const f = setup();
    f.scope.posts.add(latestPost(new Date(now.getTime() - 3_599_999)));
    await expect(f.service.getCreationStatus("user")).resolves.toStrictEqual({
      canCreate: false,
      cooldownHours: 1,
      nextAvailableAt: new Date(now.getTime() + 1).toISOString(),
    });
    await expect(f.service.create("user", input)).rejects.toMatchObject({ kind: "invalid-input" });
  });

  it("allows creation exactly at the one-hour boundary", async () => {
    const f = setup();
    f.scope.posts.add(latestPost(new Date(now.getTime() - 3_600_000)));
    await f.service.create("user", input);
    expect(f.scope.posts.saved).toHaveLength(1);
  });

  it("does not delete the post or commit when dependent deletion fails", async () => {
    const f = setup();
    await f.service.create("user", input);
    const [post] = f.scope.posts.saved;
    f.scope.replyDeletionFailure = new Error("reply deletion failed");

    await expect(f.service.delete(post.id)).rejects.toThrow("reply deletion failed");
    expect(f.scope.posts.translationsDeletedFor).toStrictEqual([]);
    expect(f.scope.posts.deleted).toStrictEqual([]);
    expect(f.scope.commits).toBe(1);
  });
});

describe("post lookup", () => {
  const stored: PostRecord = {
    author: { id: "user", userName: "Fan" },
    content: "Body",
    createdAt: now,
    id: "0a1b2c3d-0000-4000-8000-123456789abc",
    postType: PostType.DISCUSSION,
    publicId: 88,
    title: "Mon Post: Quel roster ?",
    topic: { id: "topic", title: "Topic" },
    translations: [
      {
        content: "Translated",
        createdAt: now,
        id: "t",
        locale: "en-US",
        post: { id: "0a1b2c3d-0000-4000-8000-123456789abc" },
        title: "Translated title",
        updatedAt: null,
      },
    ],
    updatedAt: null,
  };

  it("exposes the public id and a slug derived from the base title", async () => {
    const f = setup();
    f.scope.posts.add(stored);
    const ref = { kind: "publicId", value: 88 } as const;
    await expect(f.service.findByIdDto(ref, "fr-FR")).resolves.toMatchObject({
      id: stored.id,
      publicId: 88,
      slug: "mon-post-quel-roster",
      title: stored.title,
    });
  });

  it("applies the requested translation from the single lookup and keeps the base slug", async () => {
    const f = setup();
    f.scope.posts.add(stored);
    await expect(
      f.service.findByIdDto({ kind: "publicId", value: 88 }, "en-US"),
    ).resolves.toMatchObject({
      content: "Translated",
      slug: "mon-post-quel-roster",
      title: "Translated title",
    });
  });

  it("reports a missing post as null", async () => {
    const f = setup();
    await expect(
      f.service.findByIdDto({ kind: "id", value: stored.id }, "fr-FR"),
    ).resolves.toBeNull();
  });

  it("deletes by legacy id", async () => {
    const f = setup();
    f.scope.posts.add(stored);
    await f.service.delete(stored.id);
    expect(f.scope.posts.deleted).toStrictEqual([stored]);
  });
});
