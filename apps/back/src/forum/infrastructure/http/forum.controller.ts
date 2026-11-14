import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { TopicService } from "../../application/topic.service";
import { PostService } from "../../application/post.service";
import { ReplyService } from "../../../reply/application/reply.service";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { CurrentUserId } from "../../../user/infrastructure/http/decorator/current-user.decorator";
import { CreateReplyDto } from "../../../reply/infrastructure/http/dto/create-reply.dto";
import type { CreateReplyInput } from "../../../reply/infrastructure/http/dto/create-reply.dto";
import { postActivityResponse } from "./forum-response";

@Controller("forum")
export class ForumController {
  constructor(
    private readonly topicService: TopicService,
    private readonly postService: PostService,
    private readonly replyService: ReplyService,
  ) {}

  @Get()
  async getOverview() {
    const topics = await this.topicService.find();

    return {
      topics: topics.map((topic) => ({
        createdAt: topic.createdAt,
        description: topic.description,
        id: topic.id,
        postsCount: topic.posts.length,
        title: topic.title,
      })),
      totalTopics: topics.length,
    };
  }

  @Get("preview")
  async getPreview() {
    const recentPosts = await this.postService.findRecentActivity(20);

    return {
      recentPosts: recentPosts.map(postActivityResponse),
    };
  }

  @UseGuards(AuthGuard)
  @Post("replies")
  @HttpCode(HttpStatus.NO_CONTENT)
  async createReply(
    @CurrentUserId() userId: string,
    @Body({ schema: CreateReplyDto }) createReplyDto: CreateReplyInput,
  ) {
    await this.replyService.create(userId, createReplyDto);
  }
}
