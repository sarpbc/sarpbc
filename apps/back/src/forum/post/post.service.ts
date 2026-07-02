import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PostRepository } from "./post.repository";
import { TopicRepository } from "../topic/topic.repository";
import { Post, PostTranslation } from "../forum.entities";
import { CreatePostDto } from "./dto/create-post.dto";
import { UserService } from "src/user/user.service";
import { PostDto } from "./dto/post-response.dto";
import { PostType } from "./post-type.enum";
import { ReplyService } from "src/reply/reply.service";

@Injectable()
export class PostService {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly topicRepository: TopicRepository,
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

  async create(userId: string, createPostDto: CreatePostDto): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hasRecentPost = await this.postRepository.hasRecentPostByUser(userId, oneHourAgo);
    if (hasRecentPost) {
      throw new BadRequestException("You can only create one post per hour");
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

    for (const translation of post.translations.getItems()) {
      this.postRepository.getEntityManager().remove(translation);
    }
    await this.postRepository.getEntityManager().flush();

    await this.postRepository.delete(post);
  }
}
