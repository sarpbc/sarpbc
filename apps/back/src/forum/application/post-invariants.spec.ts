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
    findPaginated: jest.fn().mockResolvedValue([]),
    findByTopicId: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    findWithDetails: jest.fn().mockResolvedValue(null),
    findLatestByUser: jest.fn().mockResolvedValue(null),
    findRecentActivity: jest.fn().mockResolvedValue([]),
    save: jest.fn(async (model: PostRecord) => {
      saved.push(model);
    }),
    saveTranslation: jest.fn(async (model: TranslationRecord) => {
      translations.push(model);
    }),
    deleteTranslations: jest.fn(),
    delete: jest.fn(),
  };
  const scope: ForumWriteScope = {
    posts,
    topics: {
      findAllTopics: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(topic),
      findByTitle: jest.fn().mockResolvedValue(topic),
      save: jest.fn(),
    },
    users: { findById: jest.fn().mockResolvedValue({ id: "user", userName: "Fan", role }) },
    replies: { deleteAllForPost: jest.fn() },
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
