import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { ReplyRepository } from "./reply.repository";
import { Reply } from "../forum/forum.entities";
import { CreateReplyDto } from "./dto/create-reply.dto";
import { UserService } from "src/user/user.service";
import { Post } from "src/forum/forum.entities";
import { NewsArticle } from "src/news/domain/news-article.entity";

@Injectable()
export class ReplyService {
  constructor(
    private readonly replyRepository: ReplyRepository,
    private readonly userService: UserService,
    private readonly em: EntityManager,
  ) {}

  async findByPostId(postId: string): Promise<Reply[]> {
    return this.replyRepository.findByPostId(postId);
  }

  async findByNewsArticleId(newsArticleId: string): Promise<Reply[]> {
    return this.replyRepository.findByNewsArticleId(newsArticleId);
  }

  async create(userId: string, createReplyDto: CreateReplyDto): Promise<void> {
    if (!createReplyDto.postId && !createReplyDto.newsArticleId) {
      throw new BadRequestException("Either postId or newsArticleId must be provided");
    }

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const hasRecentReply = await this.replyRepository.hasRecentReplyByUser(userId, oneMinuteAgo);
    if (hasRecentReply) {
      throw new BadRequestException("You can only create one reply per minute");
    }

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const newReply = new Reply();
    newReply.content = createReplyDto.content;
    newReply.author = user;

    if (createReplyDto.postId) {
      const post = await this.em.findOne(Post, { id: createReplyDto.postId });
      if (!post) {
        throw new NotFoundException("Post not found");
      }
      newReply.post = post;
    }

    if (createReplyDto.newsArticleId) {
      const article = await this.em.findOne(NewsArticle, {
        id: createReplyDto.newsArticleId,
      });
      if (!article) {
        throw new NotFoundException("News article not found");
      }
      newReply.newsArticle = article;
    }

    let replyTo: Reply | null = null;
    if (createReplyDto.replyToId) {
      replyTo = await this.replyRepository.findById(createReplyDto.replyToId);
      if (!replyTo) {
        throw new NotFoundException("Reply parent not found");
      }
    }
    newReply.replyTo = replyTo;

    await this.replyRepository.save(newReply);
  }

  async delete(id: string): Promise<void> {
    const reply = await this.replyRepository.findById(id);
    if (!reply) {
      throw new NotFoundException("Reply not found");
    }

    await this.deleteWithChildren(id);
  }

  async deleteAllForPost(postId: string): Promise<void> {
    const replies = await this.replyRepository.findByPostId(postId);
    const rootReplies = replies.filter((reply) => !reply.replyTo);

    for (const reply of rootReplies) {
      await this.deleteWithChildren(reply.id);
    }
  }

  private async deleteWithChildren(replyId: string): Promise<void> {
    const children = await this.replyRepository.findChildren(replyId);
    for (const child of children) {
      await this.deleteWithChildren(child.id);
    }

    const reply = await this.replyRepository.findById(replyId);
    if (reply) {
      await this.replyRepository.delete(reply);
    }
  }
}
