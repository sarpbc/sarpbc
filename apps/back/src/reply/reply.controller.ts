import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ReplyService } from "./reply.service";
import { AuthGuard } from "../auth/auth.guard";
import { RequirePermissions } from "../user/decorator/require-permissions.decorator";
import { PermissionGuard } from "../user/user.guard";
import { CurrentUserId } from "../user/decorator/current-user.decorator";
import { CreateReplyDto } from "./dto/create-reply.dto";
import { ListRepliesQueryDto } from "./dto/list-replies-query.dto";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";

@Controller("replies")
export class ReplyController {
  constructor(private replyService: ReplyService) {}

  /** Unified list: GET /replies?targetType=match&targetId=… */
  @Get()
  async findByTarget(@Query() query: ListRepliesQueryDto) {
    return this.replyService.findByTargetPaginated(
      query.targetType,
      query.targetId,
      query.page,
      query.limit,
    );
  }

  @Get("post/:postId")
  async findByPost(
    @Param("postId", ParseUUIDPipe) postId: string,
    @Query() { page, limit }: PaginationQueryDto,
  ) {
    return this.replyService.findByTargetPaginated("forumPost", postId, page, limit);
  }

  @Get("news/:newsArticleId")
  async findByNewsArticle(
    @Param("newsArticleId", ParseUUIDPipe) newsArticleId: string,
    @Query() { page, limit }: PaginationQueryDto,
  ) {
    return this.replyService.findByTargetPaginated("newsArticle", newsArticleId, page, limit);
  }

  @Get("match/:matchId")
  async findByMatch(
    @Param("matchId", ParseUUIDPipe) matchId: string,
    @Query() { page, limit }: PaginationQueryDto,
  ) {
    return this.replyService.findByTargetPaginated("match", matchId, page, limit);
  }

  @UseGuards(AuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUserId() userId: string, @Body() createReplyDto: CreateReplyDto) {
    const reply = await this.replyService.create(userId, createReplyDto);
    return { reply };
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("forum.moderate")
  @Patch(":id/hide")
  @HttpCode(HttpStatus.NO_CONTENT)
  async hide(@Param("id", ParseUUIDPipe) id: string) {
    await this.replyService.hide(id);
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("forum.moderate")
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.replyService.delete(id);
  }
}
