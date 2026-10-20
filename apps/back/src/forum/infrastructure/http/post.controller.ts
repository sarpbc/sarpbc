import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  Request,
} from "@nestjs/common";
import { forumPostSlug } from "@sarpbc/utils";
import { EntityRefPipe } from "../../../common/infrastructure/http/entity-ref.pipe";
import type { EntityRef } from "../../../common/domain/entity-ref";
import { PostService } from "../../application/post.service";
import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";
import { CurrentUserId } from "../../../user/infrastructure/http/decorator/current-user.decorator";
import { CreatePostDto } from "./post/dto/create-post.dto";
import { PostCreationStatusDto } from "./post/dto/post-creation-status.dto";
import { PostResponse } from "./post/dto/post-response.dto";
import { AuthenticatedUserRequest } from "../../../common/infrastructure/http/types/authenticated.interface";
import { ReplyService } from "../../../reply/application/reply.service";

@Controller("posts")
export class PostController {
  constructor(
    private postService: PostService,
    private replyService: ReplyService,
  ) {}

  @Get()
  async findAll() {
    const posts = await this.postService.find({});
    const commentCounts = await this.replyService.countByTargetIds(
      "forumPost",
      posts.map((post) => post.id),
    );
    return {
      posts: posts.map((post) => ({
        id: post.id,
        publicId: post.publicId,
        slug: forumPostSlug(post.title),
        title: post.title,
        author: post.author.userName,
        createdAt: post.createdAt,
        commentCount: commentCounts.get(post.id) ?? 0,
        topic: {
          id: post.topic.id,
          title: post.topic.title,
        },
      })),
    };
  }

  @Get("topic/:topicId")
  async findByTopic(@Param("topicId") topicId: string) {
    const posts = await this.postService.findByTopicId(topicId);
    return { posts: posts.map((post) => ({ ...post, slug: forumPostSlug(post.title) })) };
  }

  @Get("creation-status")
  @UseGuards(AuthGuard)
  async getCreationStatus(@CurrentUserId() userId: string): Promise<PostCreationStatusDto> {
    return this.postService.getCreationStatus(userId);
  }

  @Get(":ref")
  async findById(
    @Param("ref", EntityRefPipe) ref: EntityRef,
    @Request() req: AuthenticatedUserRequest,
  ): Promise<PostResponse> {
    const post = await this.postService.findByIdDto(ref);
    if (!post) return { post: null };

    const preferred = (req.headers["accept-language"] || "en-US").split(",")[0];
    if (preferred && preferred.toLowerCase().startsWith("fr")) {
      const p = await this.postService.findById(ref);
      const trans = p?.translations.find((t) => t.locale === "fr-FR");
      if (trans) {
        post.title = trans.title;
        post.content = trans.content;
      }
    }

    return { post };
  }

  @UseGuards(AuthGuard)
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async create(
    @CurrentUserId() userId: string,
    @Body({ schema: CreatePostDto }) createPostDto: CreatePostDto,
  ) {
    await this.postService.create(userId, createPostDto);
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("forum.moderate")
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.postService.delete(id);
  }
}
