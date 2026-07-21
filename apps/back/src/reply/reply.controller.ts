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
import { AdminGuard } from "../user/user.guard";
import { CurrentUserId } from "../user/decorator/current-user.decorator";
import { CreateReplyDto } from "./dto/create-reply.dto";
import { ListRepliesQueryDto } from "./dto/list-replies-query.dto";

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

  @UseGuards(AuthGuard, AdminGuard)
  @Patch(":id/hide")
  @HttpCode(HttpStatus.NO_CONTENT)
  async hide(@Param("id", ParseUUIDPipe) id: string) {
    await this.replyService.hide(id);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.replyService.delete(id);
  }
}
