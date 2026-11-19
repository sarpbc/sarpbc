import { FORUM_ERROR_CODES } from "@sarpbc/types";
import type { ForumPost, ForumPostCreationStatus, SupportedLocale } from "@sarpbc/types";
import { forumPostSlug } from "@sarpbc/utils";
import { mapSequentially } from "../../common/application/sequentially";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { ConflictError } from "../../common/domain/errors/conflict-error";
import type { EntityRef } from "../../common/domain/entity-ref";
import { sanitizePlainText } from "../../common/domain/html";
import { POST_CREATION_COOLDOWN_HOURS, POST_CREATION_COOLDOWN_MS } from "../domain/forum.constants";
import { PostType } from "../domain/post-type.enum";
import type { NewPostRecord, CreatePostInput } from "./models";
import type { PostStore, ForumTransaction } from "./ports";

export class PostService {
  constructor(
    private readonly postRepository: PostStore,
    private readonly transaction: ForumTransaction,
    private readonly now: () => Date = () => new Date(),
    private readonly id: () => string = () => crypto.randomUUID(),
  ) {}

  async find(options: { limit?: number; offset?: number }) {
    return await this.postRepository.findPaginated(options);
  }

  async findByTopicId(topicId: string) {
    return await this.postRepository.findByTopicId(topicId);
  }

  async findById(ref: EntityRef) {
    return await this.postRepository.findWithDetails(ref);
  }

  async findByIdDto(ref: EntityRef, locale: SupportedLocale) {
    const post = await this.findById(ref);

    if (!post) {
      return null satisfies ForumPost | null;
    }

    const translation = post.translations.find((t) => t.locale === locale);

    return {
      author: post.author.userName,
      content: translation?.content ?? post.content,
      createdAt: post.createdAt,
      id: post.id,
      publicId: post.publicId,
      slug: forumPostSlug(post.title),
      title: translation?.title ?? post.title,
      topic: { id: post.topic.id, title: post.topic.title },
    } satisfies ForumPost | null;
  }

  async getCreationStatus(userId: string) {
    const eligibility = await this.resolvePostCreationEligibility(userId);

    return {
      canCreate: eligibility.canCreate,
      cooldownHours: POST_CREATION_COOLDOWN_HOURS,
      nextAvailableAt: eligibility.nextAvailableAt?.toISOString() ?? null,
    } satisfies ForumPostCreationStatus;
  }

  async create(userId: string, createPostInput: CreatePostInput) {
    await this.transaction.run(async (scope) => {
      const eligibility = await this.resolvePostCreationEligibility(userId, scope.posts);

      if (!eligibility.canCreate) {
        throw new InvalidInputError({
          code: FORUM_ERROR_CODES.POST_RATE_LIMITED,
          message:
            "You can only create one post per hour. Wait until the cooldown ends and try again.",
        });
      }

      const existing = await scope.posts.findById(createPostInput.id);

      if (existing) {
        throw new ConflictError(
          "A post with this ID already exists. Refresh the page and try again.",
        );
      }

      const topic = await scope.topics.findById(createPostInput.topicId);

      if (!topic) {
        throw new NotFoundError("Topic not found");
      }

      const user = await scope.users.findById(userId);

      if (!user) {
        throw new NotFoundError("User not found");
      }

      const newPost: NewPostRecord = {
        author: user,
        content: sanitizePlainText(createPostInput.content),
        createdAt: this.now(),
        id: createPostInput.id,
        postType: PostType.DISCUSSION,
        title: sanitizePlainText(createPostInput.title),
        topic,
        translations: [],
        updatedAt: null,
      };

      await scope.posts.save(newPost);

      if (
        user.role === "admin" &&
        createPostInput.translations?.length !== undefined &&
        createPostInput.translations.length !== 0
      ) {
        const translations = createPostInput.translations.map((tr) => ({
          content: sanitizePlainText(tr.content),
          createdAt: this.now(),
          id: this.id(),
          locale: tr.locale,
          post: { id: newPost.id },
          title: sanitizePlainText(tr.title),
          updatedAt: null,
        }));

        await mapSequentially(translations, async (translation) => {
          await scope.posts.saveTranslation(translation);
        });
      }
    });
    const created = await this.postRepository.findById(createPostInput.id);

    if (!created) {
      throw new NotFoundError("Post not found");
    }

    return { publicId: created.publicId, slug: forumPostSlug(created.title) };
  }

  async findRecentActivity(limit = 20) {
    return await this.postRepository.findRecentActivity(limit);
  }

  async delete(id: string) {
    await this.transaction.run(async (scope) => {
      const post = await scope.posts.findWithDetails({ kind: "id", value: id });

      if (!post) {
        throw new NotFoundError("Post not found");
      }

      await scope.replies.deleteAllForPost(id);

      await scope.posts.deleteTranslations(post);

      await scope.posts.delete(post);
    });
  }

  private async resolvePostCreationEligibility(
    userId: string,
    posts: PostStore = this.postRepository,
  ) {
    const latest = await posts.findLatestByUser(userId);

    if (!latest) {
      return { canCreate: true, nextAvailableAt: null };
    }

    const nextAvailable = new Date(latest.createdAt.getTime() + POST_CREATION_COOLDOWN_MS);
    const canCreate = nextAvailable <= this.now();

    return {
      canCreate,
      nextAvailableAt: canCreate ? null : nextAvailable,
    };
  }
}
