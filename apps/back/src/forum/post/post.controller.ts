import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Request,
} from "@nestjs/common";
import { PostService } from "./post.service";
import { AuthGuard } from "../../auth/auth.guard";
import { RequirePermissions } from "../../user/decorator/require-permissions.decorator";
import { PermissionGuard } from "../../user/user.guard";
import { CurrentUserId } from "../../user/decorator/current-user.decorator";
import { CreatePostDto } from "./dto/create-post.dto";
import { PostCreationStatusDto } from "./dto/post-creation-status.dto";
import { PostResponse } from "./dto/post-response.dto";
import { AuthenticatedUserRequest } from "src/common/types/authenticated.interface";

@Controller("posts")
@UseInterceptors(ClassSerializerInterceptor)
export class PostController {
  constructor(private postService: PostService) {}

  @Get()
  async findAll() {
    const posts = await this.postService.find({});
    return {
      posts: posts.map((post) => ({
        id: post.id,
        title: post.title,
        author: post.author.userName,
        createdAt: post.createdAt,
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
    return { posts };
  }

  @Get("creation-status")
  @UseGuards(AuthGuard)
  async getCreationStatus(@CurrentUserId() userId: string): Promise<PostCreationStatusDto> {
    return this.postService.getCreationStatus(userId);
  }

  @Get(":id")
  async findById(
    @Param("id", ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedUserRequest,
  ): Promise<PostResponse> {
    const post = await this.postService.findByIdDto(id);
    if (!post) return { post: null };

    const preferred = (req.headers["accept-language"] || "en-US").split(",")[0];
    if (preferred && preferred.toLowerCase().startsWith("fr")) {
      const p = await this.postService.findById(id);
      const trans = p?.translations.getItems().find((t: any) => t.locale === "fr-FR");
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
  async create(@CurrentUserId() userId: string, @Body() createPostDto: CreatePostDto) {
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
