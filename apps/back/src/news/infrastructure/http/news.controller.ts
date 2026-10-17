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
import { PaginationQueryDto } from "../../../common/infrastructure/http/dto/pagination-query.dto";
import { NewsListQueryDto, NewsLocaleQueryDto } from "./dto/news-locale-query.dto";
import { parseNewsLocale } from "../../domain/news-locale.util";
import { NewsService } from "../../application/news.service";
import { CreateNewsArticleDto } from "./dto/create-news-article.dto";
import { TweetEmbedQueryDto } from "./dto/tweet-embed-query.dto";
import { TweetEmbedService } from "../../application/tweet-embed.service";

import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { CurrentUserId } from "../../../user/infrastructure/http/decorator/current-user.decorator";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { ReplyService } from "../../../reply/application/reply.service";
import { ReplyContentDto } from "../../../reply/infrastructure/http/dto/create-reply.dto";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";

@Controller("news")
export class NewsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly replyService: ReplyService,
    private readonly tweetEmbedService: TweetEmbedService,
  ) {}

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("news.manage")
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUserId() userId: string,
    @Body({ schema: CreateNewsArticleDto }) createNewsArticleDto: CreateNewsArticleDto,
  ) {
    return this.newsService.create(createNewsArticleDto, userId);
  }

  @Get()
  findAll(@Query({ schema: NewsListQueryDto }) { page, limit, locale, type }: NewsListQueryDto) {
    return this.newsService.findAllPublishedArticle(page, limit, parseNewsLocale(locale), type);
  }

  @Get("sitemap")
  findSitemapMeta() {
    return this.newsService.findPublishedSitemapMeta();
  }

  @Get("sitemap/:chunk")
  findSitemapChunk(@Param("chunk", ParseIntPipe) chunk: number) {
    return this.newsService.findPublishedSitemapChunk(chunk);
  }

  @Get("embed/tweet")
  embedTweet(@Query({ schema: TweetEmbedQueryDto }) { url }: TweetEmbedQueryDto) {
    return this.tweetEmbedService.embed(url);
  }

  @Get("weeks/:week")
  findWeek(
    @Param("week") week: string,
    @Query({ schema: NewsLocaleQueryDto }) { locale }: NewsLocaleQueryDto,
  ) {
    return this.newsService.findPublishedShortsByWeek(week, parseNewsLocale(locale));
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("news.manage")
  @Get("admin")
  findAllAdmin(@Query({ schema: PaginationQueryDto }) { page, limit }: PaginationQueryDto) {
    return this.newsService.findAll(page, limit);
  }

  @Get(":slug")
  async findOne(
    @Param("slug") slug: string,
    @Query({ schema: NewsLocaleQueryDto }) { locale }: NewsLocaleQueryDto,
  ) {
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
  async update(
    @Param("slug") slug: string,
    @Body({ schema: UpdateNewsArticleDto }) dto: UpdateNewsArticleDto,
  ) {
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
    @Body({ schema: ReplyContentDto }) dto: ReplyContentDto,
  ) {
    const articleId = await this.newsService.findArticleIdBySlug(slug);
    const reply = await this.replyService.create(userId, {
      ...dto,
      newsArticleId: articleId,
    });
    return { reply };
  }
}
