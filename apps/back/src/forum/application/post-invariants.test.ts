import { describe, expect, it, vi } from "vitest";
import { PostService } from "./post.service";
import type { ForumWriteScope, ForumTransaction, PostStore, TopicStore } from "./ports";
import type { NewPostRecord, PostRecord, TopicRecord, TranslationRecord } from "./models";
import type { Author } from "../../common/domain/author";
import { PostType } from "../domain/post-type.enum";

const now = new Date("2026-10-15T12:00:00Z");

const setup = (role: Author["role"] = "admin") => {
  const topic: TopicRecord = {
    id: "topic",
    title: "Topic",
    description: null,
    createdAt: now,
    updatedAt: null,
    posts: [],
  };

  const saved: NewPostRecord[] = [];
  const translations: TranslationRecord[] = [];

  const posts = {
    findPaginated: vi.fn<PostStore["findPaginated"]>().mockResolvedValue([]),
    findByTopicId: vi.fn<PostStore["findByTopicId"]>().mockResolvedValue([]),
    findById: vi.fn<PostStore["findById"]>(async (id) => {
      const post = saved.find((candidate) => candidate.id === id);

      return post ? { ...post, publicId: 41 } : null;
    }),
    findWithDetails: vi.fn<PostStore["findWithDetails"]>().mockResolvedValue(null),
    findLatestByUser: vi.fn<PostStore["findLatestByUser"]>().mockResolvedValue(null),
    findRecentActivity: vi.fn<PostStore["findRecentActivity"]>().mockResolvedValue([]),
    save: vi.fn<PostStore["save"]>(async (model) => {
      saved.push(model);
    }),
    saveTranslation: vi.fn<PostStore["saveTranslation"]>(async (model) => {
      translations.push(model);
    }),
    deleteTranslations: vi.fn<PostStore["deleteTranslations"]>(),
    delete: vi.fn<PostStore["delete"]>(),
  };

  const scope: ForumWriteScope = {
    posts,
    topics: {
      findAllTopics: vi.fn<TopicStore["findAllTopics"]>().mockResolvedValue([]),
      findById: vi.fn<TopicStore["findById"]>().mockResolvedValue(topic),
      findByTitle: vi.fn<TopicStore["findByTitle"]>().mockResolvedValue(topic),
      save: vi.fn<TopicStore["save"]>(),
    },
    users: {
      findById: vi
        .fn<ForumWriteScope["users"]["findById"]>()
        .mockResolvedValue({ id: "user", userName: "Fan", role }),
    },
    replies: { deleteAllForPost: vi.fn<ForumWriteScope["replies"]["deleteAllForPost"]>() },
  };

  let commits = 0;

  const transaction: ForumTransaction = {
    async run(work) {
      const result = await work(scope);
      commits += 1;

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
    posts,
    saved,
    translations,
    commits: () => commits,
  };
};

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
    await expect(f.service.create("user", input)).resolves.toStrictEqual({
      publicId: 41,
      slug: "title",
    });
    expect(f.saved[0]?.title).toBe("Title");
    expect(f.translations[0]?.title).toBe("Titre");
    expect(f.translations[0]?.post.id).toBe("post");
    expect(f.commits()).toBe(1);
  });

  it("ignores translations from non-admin authors", async () => {
    const f = setup(null);
    await f.service.create("user", input);
    expect(f.saved).toHaveLength(1);
    expect(f.translations).toStrictEqual([]);
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
      createdAt: new Date(now.getTime() - 3_599_999),
      updatedAt: null,
      translations: [],
    });
    await expect(f.service.getCreationStatus("user")).resolves.toStrictEqual({
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
      createdAt: new Date(now.getTime() - 3_600_000),
      updatedAt: null,
      translations: [],
    });
    await f.service.create("user", input);
    expect(f.saved).toHaveLength(1);
  });

  it("does not delete the post or commit when dependent deletion fails", async () => {
    const f = setup();
    await f.service.create("user", input);
    const [post] = f.saved;
    f.scope.posts.findWithDetails = async () => ({ ...post, publicId: 41 });
    f.scope.replies.deleteAllForPost = async () => {
      throw new Error("reply deletion failed");
    };

    await expect(f.service.delete(post.id)).rejects.toThrow("reply deletion failed");
    expect(f.posts.deleteTranslations).not.toHaveBeenCalled();
    expect(f.posts.delete).not.toHaveBeenCalled();
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
  };

  it("exposes the public id and a slug derived from the base title", async () => {
    const f = setup();
    vi.spyOn(f.scope.posts, "findWithDetails").mockResolvedValue(stored);
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
    vi.spyOn(f.scope.posts, "findWithDetails").mockResolvedValue(stored);
    await expect(
      f.service.findByIdDto({ kind: "publicId", value: 88 }, "en-US"),
    ).resolves.toMatchObject({
      slug: "mon-post-quel-roster",
      title: "Translated title",
      content: "Translated",
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
    vi.spyOn(f.scope.posts, "findWithDetails").mockResolvedValue(stored);
    await f.service.delete(stored.id);
    expect(f.posts.delete).toHaveBeenCalledExactlyOnceWith(stored);
  });
});
