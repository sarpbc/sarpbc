import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UpdateNewsArticleDto } from "./dto/update-news-article.dto";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { NewsService } from "./news.service";
import { CreateNewsArticleDto } from "./dto/create-news-article.dto";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../user/decorator/current-user.decorator";
import { ReplyService } from "../reply/reply.service";
import { CreateReplyDto } from "../reply/dto/create-reply.dto";
import { AdminGuard } from "src/user/user.guard";

@Controller("news")
export class NewsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly replyService: ReplyService,
  ) {}

  @UseGuards(AuthGuard, AdminGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUserId() userId: string,
    @Body() createNewsArticleDto: CreateNewsArticleDto,
  ) {
    return this.newsService.create(createNewsArticleDto, userId);
  }

  @Get()
  findAll(@Query() { page, limit }: PaginationQueryDto) {
    return this.newsService.findAllPublishedArticle(page, limit);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Get("admin")
  findAllAdmin(@Query() { page, limit }: PaginationQueryDto) {
    return this.newsService.findAll(page, limit);
  }

  @Get(":slug")
  async findOne(@Param("slug") slug: string) {
    const article = await this.newsService.findOneBySlug(slug);
    if (!article || article.isDraft) {
      throw new NotFoundException(`News article with slug "${slug}" not found`);
    }
    return article;
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Get("admin/:slug")
  async findOneAdmin(@Param("slug") slug: string) {
    return this.newsService.findOneBySlug(slug);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch(":slug")
  async update(@Param("slug") slug: string, @Body() dto: UpdateNewsArticleDto) {
    return this.newsService.update(slug, dto);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch(":slug/publish")
  @HttpCode(HttpStatus.NO_CONTENT)
  async publish(@Param("slug") slug: string) {
    await this.newsService.setDraftStatus(slug, false);
  }

  @UseGuards(AuthGuard, AdminGuard)
  @Patch(":slug/unpublish")
  @HttpCode(HttpStatus.NO_CONTENT)
  async unpublish(@Param("slug") slug: string) {
    await this.newsService.setDraftStatus(slug, true);
  }

  @Get(":slug/replies")
  async findReplies(@Param("slug") slug: string) {
    const articleId = await this.newsService.findArticleIdBySlug(slug);
    const replies = await this.replyService.findByNewsArticleId(articleId);
    return { replies };
  }

  @UseGuards(AuthGuard)
  @Post(":slug/replies")
  async createReply(
    @Param("slug") slug: string,
    @CurrentUserId() userId: string,
    @Body() dto: Omit<CreateReplyDto, "postId" | "newsArticleId">,
  ) {
    const articleId = await this.newsService.findArticleIdBySlug(slug);
    await this.replyService.create(userId, {
      ...dto,
      newsArticleId: articleId,
    });
    return { success: true };
  }
}
