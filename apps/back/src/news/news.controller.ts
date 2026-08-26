import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UpdateNewsArticleDto } from "./dto/update-news-article.dto";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { NewsListQueryDto, NewsLocaleQueryDto } from "./dto/news-locale-query.dto";
import { parseNewsLocale } from "./news-locale.util";
import { NewsService } from "./news.service";
import { CreateNewsArticleDto } from "./dto/create-news-article.dto";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../user/decorator/current-user.decorator";
import { RequirePermissions } from "../user/decorator/require-permissions.decorator";
import { ReplyService } from "../reply/reply.service";
import { CreateReplyDto } from "../reply/dto/create-reply.dto";
import { PermissionGuard } from "src/user/user.guard";

@Controller("news")
export class NewsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly replyService: ReplyService,
  ) {}

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("news.manage")
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUserId() userId: string,
    @Body() createNewsArticleDto: CreateNewsArticleDto,
  ) {
    return this.newsService.create(createNewsArticleDto, userId);
  }

  @Get()
  findAll(@Query() { page, limit, locale }: NewsListQueryDto) {
    return this.newsService.findAllPublishedArticle(page, limit, parseNewsLocale(locale));
  }

  @Get("sitemap")
  findSitemapMeta() {
    return this.newsService.findPublishedSitemapMeta();
  }

  @Get("sitemap/:chunk")
  findSitemapChunk(@Param("chunk", ParseIntPipe) chunk: number) {
    return this.newsService.findPublishedSitemapChunk(chunk);
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("news.manage")
  @Get("admin")
  findAllAdmin(@Query() { page, limit }: PaginationQueryDto) {
    return this.newsService.findAll(page, limit);
  }

  @Get(":slug")
  async findOne(@Param("slug") slug: string, @Query() { locale }: NewsLocaleQueryDto) {
    const article = await this.newsService.findOneBySlug(slug, parseNewsLocale(locale));
    if (!article || article.isDraft) {
      throw new NotFoundException(`News article with slug "${slug}" not found`);
    }
    return article;
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("news.manage")
  @Get("admin/:slug")
  async findOneAdmin(@Param("slug") slug: string) {
    return this.newsService.findOneAdminBySlug(slug);
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("news.manage")
  @Patch(":slug")
  async update(@Param("slug") slug: string, @Body() dto: UpdateNewsArticleDto) {
    return this.newsService.update(slug, dto);
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("news.manage")
  @Patch(":slug/publish")
  @HttpCode(HttpStatus.NO_CONTENT)
  async publish(@Param("slug") slug: string) {
    await this.newsService.setDraftStatus(slug, false);
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("news.manage")
  @Patch(":slug/unpublish")
  @HttpCode(HttpStatus.NO_CONTENT)
  async unpublish(@Param("slug") slug: string) {
    await this.newsService.setDraftStatus(slug, true);
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("news.manage")
  @Delete(":slug")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("slug") slug: string) {
    await this.newsService.delete(slug);
  }

  @UseGuards(AuthGuard)
  @Post(":slug/replies")
  async createReply(
    @Param("slug") slug: string,
    @CurrentUserId() userId: string,
    @Body() dto: Omit<CreateReplyDto, "postId" | "newsArticleId" | "matchId">,
  ) {
    const articleId = await this.newsService.findArticleIdBySlug(slug);
    const reply = await this.replyService.create(userId, {
      ...dto,
      newsArticleId: articleId,
    });
    return { reply };
  }
}
