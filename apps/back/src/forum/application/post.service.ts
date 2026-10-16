import { InvalidInputError, NotFoundError, ConflictError } from "../../common/domain/errors";
import { sanitizePlainText } from "../../common/domain/html";
import {
  FORUM_ERROR_CODES,
  POST_CREATION_COOLDOWN_HOURS,
  POST_CREATION_COOLDOWN_MS,
} from "../domain/forum.constants";
import { PostType } from "../domain/post-type.enum";
import type {
  PostRecord,
  TranslationRecord,
  CreatePostInput,
  PostView,
  PostReplyView,
  PostCreationStatus,
} from "../domain/forum";
import type { ReplyRecord } from "../../reply/domain/reply";
import type { PostStore, ForumTransaction } from "./ports";
interface PostCreationEligibility {
  canCreate: boolean;
  nextAvailableAt: Date | null;
}

export class PostService {
  constructor(
    private readonly postRepository: PostStore,
    private readonly transaction: ForumTransaction,
    private readonly now: () => Date = () => new Date(),
    private readonly id: () => string = () => crypto.randomUUID(),
  ) {}

  async find(options: { limit?: number; offset?: number }): Promise<PostRecord[]> {
    return this.postRepository.findPaginated(options);
  }

  async findByTopicId(topicId: string): Promise<PostRecord[]> {
    return this.postRepository.findByTopicId(topicId);
  }

  async findById(id: string): Promise<PostRecord | null> {
    return this.postRepository.findWithDetails(id);
  }

  async findByIdDto(id: string): Promise<PostView | null> {
    const post = await this.findById(id);
    if (!post) return null;

    const buildNestedReplies = (replies: ReplyRecord[]) => {
      const replyMap = new Map<string, PostReplyView>();
      const rootReplies: PostReplyView[] = [];

      replies.forEach((reply) => {
        replyMap.set(reply.id, {
          id: reply.id,
          content: reply.content,
          author: reply.author.userName,
          createdAt: reply.createdAt,
          replyTo: reply.replyTo?.id || null,
          replies: [],
        });
      });

      replies.forEach((reply) => {
        const replyDto = replyMap.get(reply.id)!;
        if (reply.replyTo?.id) {
          const parent = replyMap.get(reply.replyTo.id);
          if (parent) {
            parent.replies.push(replyDto);
          } else {
            rootReplies.push(replyDto);
          }
        } else {
          rootReplies.push(replyDto);
        }
      });

      return rootReplies;
    };

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      topic: { id: post.topic.id, title: post.topic.title },
      author: post.author.userName,
      createdAt: post.createdAt,
      replies: buildNestedReplies(post.replies.filter((reply) => !reply.hiddenAt)),
    };
  }

  async getCreationStatus(userId: string): Promise<PostCreationStatus> {
    const eligibility = await this.resolvePostCreationEligibility(userId);

    return {
      canCreate: eligibility.canCreate,
      nextAvailableAt: eligibility.nextAvailableAt?.toISOString() ?? null,
      cooldownHours: POST_CREATION_COOLDOWN_HOURS,
    };
  }

  async create(userId: string, createPostInput: CreatePostInput): Promise<void> {
    return this.transaction.run(async (scope) => {
      const eligibility = await this.resolvePostCreationEligibility(userId, scope.posts);
      if (!eligibility.canCreate) {
        throw new InvalidInputError({
          message:
            "You can only create one post per hour. Wait until the cooldown ends and try again.",
          code: FORUM_ERROR_CODES.POST_RATE_LIMITED,
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

      const newPost: PostRecord = {
        id: createPostInput.id,
        title: sanitizePlainText(createPostInput.title),
        content: sanitizePlainText(createPostInput.content),
        topic,
        author: user,
        postType: PostType.DISCUSSION,
        createdAt: this.now(),
        updatedAt: null,
        translations: [],
        replies: [],
      };
      await scope.posts.save(newPost);

      if (user.role === "admin" && createPostInput.translations?.length) {
        for (const tr of createPostInput.translations) {
          const t: TranslationRecord = {
            id: this.id(),
            post: { id: newPost.id },
            locale: tr.locale,
            title: sanitizePlainText(tr.title),
            content: sanitizePlainText(tr.content),
            createdAt: this.now(),
            updatedAt: null,
          };
          await scope.posts.saveTranslation(t);
        }
      }
    });
  }

  async findRecentActivity(limit: number = 20) {
    return this.postRepository.findRecentActivity(limit);
  }

  async delete(id: string): Promise<void> {
    return this.transaction.run(async (scope) => {
      const post = await scope.posts.findWithDetails(id);
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
  ): Promise<PostCreationEligibility> {
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
