import type { Author } from "../../common/domain/author";
import type { EntityRef } from "../../common/domain/entity-ref";
import type { NewPostRecord, PostRecord, TopicRecord, TranslationRecord } from "./models";
import type { ForumTransaction, ForumWriteScope } from "./ports";

const FIRST_PUBLIC_ID = 41;

const newestFirst = (a: PostRecord, b: PostRecord) => b.createdAt.getTime() - a.createdAt.getTime();

const inMemoryPosts = () => {
  const byId = new Map<string, PostRecord>();
  const saved: NewPostRecord[] = [];
  const translations: TranslationRecord[] = [];
  const deleted: PostRecord[] = [];
  const translationsDeletedFor: PostRecord[] = [];
  let translationFailure: Error | null = null;

  const add = (post: PostRecord) => {
    byId.set(post.id, post);
  };

  return {
    add,
    delete: async (post: PostRecord) => {
      deleted.push(post);
      byId.delete(post.id);
    },
    deleteTranslations: async (post: PostRecord) => {
      translationsDeletedFor.push(post);
    },
    deleted,
    failTranslationsWith: (error: Error) => {
      translationFailure = error;
    },
    findById: async (id: string) => byId.get(id) ?? null,
    findByTopicId: async (id: string) => [...byId.values()].filter((post) => post.topic.id === id),
    findLatestByUser: async (id: string) =>
      [...byId.values()].filter((post) => post.author.id === id).toSorted(newestFirst)[0] ?? null,
    findPaginated: async ({ limit, offset = 0 }: { limit?: number; offset?: number }) =>
      [...byId.values()]
        .toSorted(newestFirst)
        .slice(offset, limit === undefined ? undefined : offset + limit),
    findRecentActivity: async (limit: number) =>
      [...byId.values()]
        .toSorted(newestFirst)
        .slice(0, limit)
        .map((post) => ({
          id: post.id,
          lastActivity: post.createdAt,
          messageCount: 0,
          publicId: post.publicId,
          title: post.title,
        })),
    findWithDetails: async (ref: EntityRef) =>
      [...byId.values()].find((post) =>
        ref.kind === "id" ? post.id === ref.value : post.publicId === ref.value,
      ) ?? null,
    save: async (post: NewPostRecord) => {
      saved.push(post);
      add({ ...post, publicId: FIRST_PUBLIC_ID });
    },
    saveTranslation: async (translation: TranslationRecord) => {
      if (translationFailure) {
        throw translationFailure;
      }

      translations.push(translation);
    },
    saved,
    translations,
    translationsDeletedFor,
  };
};

const inMemoryTopics = () => {
  const byId = new Map<string, TopicRecord>();

  const add = (topic: TopicRecord) => {
    byId.set(topic.id, topic);
  };

  return {
    add,
    findAllTopics: async () => [...byId.values()],
    findById: async (id: string) => byId.get(id) ?? null,
    findByTitle: async (title: string) =>
      [...byId.values()].find((topic) => topic.title === title) ?? null,
    save: async (topic: TopicRecord) => {
      add(topic);
    },
  };
};

export class InMemoryForumScope implements ForumWriteScope, ForumTransaction {
  readonly posts = inMemoryPosts();
  readonly topics = inMemoryTopics();
  commits = 0;
  replyDeletionFailure: Error | null = null;
  private readonly authors = new Map<string, Author>();

  readonly users = {
    findById: async (id: string) => this.authors.get(id) ?? null,
  };

  readonly replies = {
    deleteAllForPost: async () => {
      if (this.replyDeletionFailure) {
        throw this.replyDeletionFailure;
      }
    },
  };

  addUser(author: Author) {
    this.authors.set(author.id, author);
  }

  async run<T>(work: (scope: ForumWriteScope) => Promise<T>) {
    const result = await work(this);
    this.commits += 1;

    return result;
  }
}
