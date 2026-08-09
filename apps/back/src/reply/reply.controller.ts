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
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { ReplyService } from "./reply.service";
import { AuthGuard } from "../auth/auth.guard";
import { RequirePermissions } from "../user/decorator/require-permissions.decorator";
import { PermissionGuard } from "../user/user.guard";
import { CurrentUserId } from "../user/decorator/current-user.decorator";
import { CreateReplyDto } from "./dto/create-reply.dto";
import { ListRepliesQueryDto } from "./dto/list-replies-query.dto";
import { ReportReplyDto } from "./dto/report-reply.dto";

@Controller("replies")
export class ReplyController {
  constructor(private replyService: ReplyService) {}

  /** Unified list: GET /replies?targetType=match&targetId=… */
  @Get()
  async findByTarget(@Query() query: ListRepliesQueryDto) {
    const replies = await this.replyService.findByTarget(query.targetType, query.targetId);
    return { replies };
  }

  @Get("post/:postId")
  async findByPost(@Param("postId", ParseUUIDPipe) postId: string) {
    const replies = await this.replyService.findByTarget("forumPost", postId);
    return { replies };
  }

  @Get("news/:newsArticleId")
  async findByNewsArticle(@Param("newsArticleId", ParseUUIDPipe) newsArticleId: string) {
    const replies = await this.replyService.findByTarget("newsArticle", newsArticleId);
    return { replies };
  }

  @Get("match/:matchId")
  async findByMatch(@Param("matchId", ParseUUIDPipe) matchId: string) {
    const replies = await this.replyService.findByTarget("match", matchId);
    return { replies };
  }

  @UseGuards(AuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUserId() userId: string, @Body() createReplyDto: CreateReplyDto) {
    const reply = await this.replyService.create(userId, createReplyDto);
    return { reply };
  }

  @UseGuards(AuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(":id/report")
  @HttpCode(HttpStatus.CREATED)
  async report(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() reportReplyDto: ReportReplyDto,
  ) {
    const report = await this.replyService.report(userId, id, reportReplyDto.reason);
    return { report };
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
