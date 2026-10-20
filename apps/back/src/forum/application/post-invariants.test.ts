import { describe, expect, it, vi } from "vitest";
import { PostService } from "./post.service";
import type { ForumWriteScope, ForumTransaction } from "./ports";
import type { PostRecord, TopicRecord, TranslationRecord } from "../domain/forum";
import { PostType } from "../domain/post-type.enum";
const now = new Date("2026-10-15T12:00:00Z");
function setup(role: string | null = "admin") {
  const topic: TopicRecord = {
    id: "topic",
    title: "Topic",
    description: null,
    createdAt: now,
    updatedAt: null,
    posts: [],
  };
  const saved: PostRecord[] = [];
  const translations: TranslationRecord[] = [];
  const posts = {
    findPaginated: vi.fn().mockResolvedValue([]),
    findByTopicId: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    findWithDetails: vi.fn().mockResolvedValue(null),
    findLatestByUser: vi.fn().mockResolvedValue(null),
    findRecentActivity: vi.fn().mockResolvedValue([]),
    save: vi.fn(async (model: PostRecord) => {
      saved.push(model);
    }),
    saveTranslation: vi.fn(async (model: TranslationRecord) => {
      translations.push(model);
    }),
    deleteTranslations: vi.fn(),
    delete: vi.fn(),
  };
  const scope: ForumWriteScope = {
    posts,
    topics: {
      findAllTopics: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(topic),
      findByTitle: vi.fn().mockResolvedValue(topic),
      save: vi.fn(),
    },
    users: { findById: vi.fn().mockResolvedValue({ id: "user", userName: "Fan", role }) },
    replies: { deleteAllForPost: vi.fn() },
  };
  let commits = 0;
  const transaction: ForumTransaction = {
    async run(work) {
      const result = await work(scope);
      commits++;
      return result;
    },
  };
  return {
    service: new PostService(
      posts,
      transaction,
      () => now,
      () => "translation",
    ),
    scope,
    saved,
    translations,
    commits: () => commits,
  };
}
const input = {
  id: "post",
  topicId: "topic",
  title: "<b>Title</b>",
  content: "<script>bad()</script>Body",
  translations: [{ locale: "fr-FR" as const, title: "<b>Titre</b>", content: "Corps" }],
};
describe("post transaction and policies", () => {
  it("creates the post and sanitized admin translations before a single commit", async () => {
    const f = setup();
    await f.service.create("user", input);
    expect(f.saved[0]?.title).toBe("Title");
    expect(f.translations[0]?.title).toBe("Titre");
    expect(f.translations[0]?.post.id).toBe("post");
    expect(f.commits()).toBe(1);
  });
  it("ignores translations from non-admin authors", async () => {
    const f = setup(null);
    await f.service.create("user", input);
    expect(f.saved).toHaveLength(1);
    expect(f.translations).toEqual([]);
  });
  it("does not commit a post if a translation fails", async () => {
    const f = setup();
    f.scope.posts.saveTranslation = async () => {
      throw new Error("translation failed");
    };
    await expect(f.service.create("user", input)).rejects.toThrow("translation failed");
    expect(f.commits()).toBe(0);
  });
  it("reports the next available time until the one-hour boundary", async () => {
    const f = setup();
    f.scope.posts.findLatestByUser = async () => ({
      id: "latest",
      publicId: 1,
      title: "Post",
      content: "Body",
      author: { id: "user", userName: "Fan" },
      topic: { id: "topic", title: "Topic" },
      postType: PostType.DISCUSSION,
      createdAt: new Date(now.getTime() - 3599999),
      updatedAt: null,
      translations: [],
      replies: [],
    });
    expect(await f.service.getCreationStatus("user")).toEqual({
      canCreate: false,
      nextAvailableAt: new Date(now.getTime() + 1).toISOString(),
      cooldownHours: 1,
    });
    await expect(f.service.create("user", input)).rejects.toMatchObject({ kind: "invalid-input" });
  });
  it("allows creation exactly at the one-hour boundary", async () => {
    const f = setup();
    f.scope.posts.findLatestByUser = async () => ({
      id: "latest",
      publicId: 1,
      title: "Post",
      content: "Body",
      author: { id: "user", userName: "Fan" },
      topic: { id: "topic", title: "Topic" },
      postType: PostType.DISCUSSION,
      createdAt: new Date(now.getTime() - 3600000),
      updatedAt: null,
      translations: [],
      replies: [],
    });
    await f.service.create("user", input);
    expect(f.saved).toHaveLength(1);
  });
  it("deletes replies and translations before their post in one transaction", async () => {
    const f = setup();
    await f.service.create("user", input);
    const post = f.saved[0]!;
    const order: string[] = [];
    f.scope.posts.findWithDetails = async () => post;
    f.scope.replies.deleteAllForPost = async () => {
      order.push("replies");
    };
    f.scope.posts.deleteTranslations = async () => {
      order.push("translations");
    };
    f.scope.posts.delete = async () => {
      order.push("post");
    };
    await f.service.delete(post.id);
    expect(order).toEqual(["replies", "translations", "post"]);
    expect(f.commits()).toBe(2);
  });
  it("does not delete the post or commit when dependent deletion fails", async () => {
    const f = setup();
    await f.service.create("user", input);
    const post = f.saved[0]!;
    f.scope.posts.findWithDetails = async () => post;
    f.scope.replies.deleteAllForPost = async () => {
      throw new Error("reply deletion failed");
    };
    await expect(f.service.delete(post.id)).rejects.toThrow("reply deletion failed");
    expect(f.scope.posts.deleteTranslations).not.toHaveBeenCalled();
    expect(f.scope.posts.delete).not.toHaveBeenCalled();
    expect(f.commits()).toBe(1);
  });
});
describe("post lookup", () => {
  const stored: PostRecord = {
    id: "0a1b2c3d-0000-4000-8000-123456789abc",
    publicId: 88,
    title: "Mon Post: Quel roster ?",
    content: "Body",
    author: { id: "user", userName: "Fan" },
    topic: { id: "topic", title: "Topic" },
    postType: PostType.DISCUSSION,
    createdAt: now,
    updatedAt: null,
    translations: [
      {
        id: "t",
        post: { id: "0a1b2c3d-0000-4000-8000-123456789abc" },
        locale: "en-US",
        title: "Translated title",
        content: "Translated",
        createdAt: now,
        updatedAt: null,
      },
    ],
    replies: [],
  };
  it("exposes the public id and a slug derived from the base title", async () => {
    const f = setup();
    f.scope.posts.findWithDetails = vi.fn().mockResolvedValue(stored);
    const ref = { kind: "publicId", value: 88 } as const;
    expect(await f.service.findByIdDto(ref)).toMatchObject({
      id: stored.id,
      publicId: 88,
      slug: "mon-post-quel-roster",
    });
    expect(f.scope.posts.findWithDetails).toHaveBeenCalledWith(ref);
  });
  it("reports a missing post as null", async () => {
    const f = setup();
    expect(await f.service.findByIdDto({ kind: "id", value: stored.id })).toBeNull();
  });
  it("deletes by legacy id", async () => {
    const f = setup();
    f.scope.posts.findWithDetails = vi.fn().mockResolvedValue(stored);
    await f.service.delete(stored.id);
    expect(f.scope.posts.findWithDetails).toHaveBeenCalledWith({ kind: "id", value: stored.id });
  });
});
