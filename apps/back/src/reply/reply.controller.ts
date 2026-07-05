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
} from "@nestjs/common";
import { ReplyService } from "./reply.service";
import { AuthGuard } from "../auth/auth.guard";
import { AdminGuard } from "../user/user.guard";
import { CurrentUserId } from "../user/decorator/current-user.decorator";
import { CreateReplyDto } from "./dto/create-reply.dto";

@Controller("replies")
export class ReplyController {
  constructor(private replyService: ReplyService) {}

  @Get("post/:postId")
  async findByPost(@Param("postId") postId: string) {
    const replies = await this.replyService.findByPostId(postId);
    return { replies };
  }

  @Get("news/:newsArticleId")
  async findByNewsArticle(@Param("newsArticleId") newsArticleId: string) {
    const replies = await this.replyService.findByNewsArticleId(newsArticleId);
    return { replies };
  }

  @UseGuards(AuthGuard)
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async create(@CurrentUserId() userId: string, @Body() createReplyDto: CreateReplyDto) {
    await this.replyService.create(userId, createReplyDto);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.replyService.delete(id);
  }
}
