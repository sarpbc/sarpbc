import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Inject,
} from "@nestjs/common";
import { Post, PostTranslation } from "../forum.entities";
import { CreatePostDto } from "./dto/create-post.dto";
import { PostCreationStatusDto } from "./dto/post-creation-status.dto";
import { UserService } from "src/user/user.service";
import { PostDto } from "./dto/post-response.dto";
import { PostType } from "./post-type.enum";
import { ReplyService } from "src/reply/reply.service";
import { IPostRepository, POST_REPOSITORY } from "./domain/post.repository.interface";
import { ITopicRepository, TOPIC_REPOSITORY } from "../topic/domain/topic.repository.interface";
import {
  FORUM_ERROR_CODES,
  POST_CREATION_COOLDOWN_HOURS,
  POST_CREATION_COOLDOWN_MS,
} from "../forum.constants";

interface PostCreationEligibility {
  canCreate: boolean;
  nextAvailableAt: Date | null;
}

@Injectable()
export class PostService {
  constructor(
    @Inject(POST_REPOSITORY)
    private readonly postRepository: IPostRepository,
    @Inject(TOPIC_REPOSITORY)
    private readonly topicRepository: ITopicRepository,
    private readonly userService: UserService,
    private readonly replyService: ReplyService,
  ) {}

  async find(options: { limit?: number; offset?: number }): Promise<Post[]> {
    return this.postRepository.findPaginated(options);
  }

  async findByTopicId(topicId: string): Promise<Post[]> {
    return this.postRepository.findByTopicId(topicId);
  }

  async findById(id: string): Promise<Post | null> {
    return this.postRepository.findWithDetails(id);
  }

  async findByIdDto(id: string): Promise<PostDto | null> {
    const post = await this.findById(id);
    if (!post) return null;

    const buildNestedReplies = (replies: any[]) => {
      const replyMap = new Map();
      const rootReplies: any[] = [];

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
        const replyDto = replyMap.get(reply.id);
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
      replies: buildNestedReplies(post.replies.toArray() || []),
    };
  }

  async getCreationStatus(userId: string): Promise<PostCreationStatusDto> {
    const eligibility = await this.resolvePostCreationEligibility(userId);

    return {
      canCreate: eligibility.canCreate,
      nextAvailableAt: eligibility.nextAvailableAt?.toISOString() ?? null,
      cooldownHours: POST_CREATION_COOLDOWN_HOURS,
    };
  }

  async create(userId: string, createPostDto: CreatePostDto): Promise<void> {
    const eligibility = await this.resolvePostCreationEligibility(userId);
    if (!eligibility.canCreate) {
      throw new BadRequestException({
        message:
          "You can only create one post per hour. Wait until the cooldown ends and try again.",
        code: FORUM_ERROR_CODES.POST_RATE_LIMITED,
      });
    }

    const existing = await this.postRepository.findById(createPostDto.id);
    if (existing) {
      throw new ConflictException(
        "A post with this ID already exists. Refresh the page and try again.",
      );
    }

    const topic = await this.topicRepository.findById(createPostDto.topicId);
    if (!topic) {
      throw new NotFoundException("Topic not found");
    }

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const newPost = new Post();
    newPost.id = createPostDto.id;
    newPost.title = createPostDto.title;
    newPost.content = createPostDto.content;
    newPost.topic = topic;
    newPost.author = user;
    newPost.postType = PostType.DISCUSSION;

    await this.postRepository.save(newPost);

    if (user.admin === true && createPostDto.translations?.length) {
      for (const tr of createPostDto.translations) {
        const t = new PostTranslation();
        t.post = newPost;
        t.locale = tr.locale;
        t.title = tr.title;
        t.content = tr.content;
        await this.postRepository.saveTranslation(t);
      }
    }
  }

  async findRecentActivity(limit: number = 20) {
    return this.postRepository.findRecentActivity(limit);
  }

  async delete(id: string): Promise<void> {
    const post = await this.postRepository.findWithDetails(id);
    if (!post) {
      throw new NotFoundException("Post not found");
    }

    await this.replyService.deleteAllForPost(id);

    await this.postRepository.deleteTranslations(post);

    await this.postRepository.delete(post);
  }

  private async resolvePostCreationEligibility(userId: string): Promise<PostCreationEligibility> {
    const latest = await this.postRepository.findLatestByUser(userId);
    if (!latest) {
      return { canCreate: true, nextAvailableAt: null };
    }

    const nextAvailable = new Date(latest.createdAt.getTime() + POST_CREATION_COOLDOWN_MS);
    const canCreate = nextAvailable <= new Date();

    return {
      canCreate,
      nextAvailableAt: canCreate ? null : nextAvailable,
    };
  }
}
