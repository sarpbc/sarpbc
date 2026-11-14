import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { UpdateNewsArticleDto } from "./dto/update-news-article.dto";
import type { UpdateNewsArticleInput } from "./dto/update-news-article.dto";
import { PaginationQueryDto } from "../../../common/infrastructure/http/dto/pagination-query.dto";
import type { PaginationQueryInput } from "../../../common/infrastructure/http/dto/pagination-query.dto";
import { NewsListQueryDto, NewsLocaleQueryDto } from "./dto/news-locale-query.dto";
import type { NewsListQueryInput, NewsLocaleQueryInput } from "./dto/news-locale-query.dto";
import { parseLocale } from "@sarpbc/utils";
import { NewsService } from "../../application/news.service";
import { CreateNewsArticleDto } from "./dto/create-news-article.dto";
import type { CreateNewsArticleInput } from "./dto/create-news-article.dto";
import { TweetEmbedQueryDto } from "./dto/tweet-embed-query.dto";
import type { TweetEmbedQueryInput } from "./dto/tweet-embed-query.dto";
import { TweetEmbedService } from "../../application/tweet-embed.service";
import { TweetImageService } from "../../application/tweet-image.service";

import { AuthGuard } from "../../../auth/infrastructure/http/auth.guard";
import { CurrentUserId } from "../../../user/infrastructure/http/decorator/current-user.decorator";
import { RequirePermissions } from "../../../user/infrastructure/http/decorator/require-permissions.decorator";
import { ReplyService } from "../../../reply/application/reply.service";
import { ReplyContentDto } from "../../../reply/infrastructure/http/dto/create-reply.dto";
import type { ReplyContentInput } from "../../../reply/infrastructure/http/dto/create-reply.dto";
import { PermissionGuard } from "../../../user/infrastructure/http/user.guard";

@Controller("news")
export class NewsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly replyService: ReplyService,
    private readonly tweetEmbedService: TweetEmbedService,
    private readonly tweetImageService: TweetImageService,
  ) {}

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("news.manage")
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUserId() userId: string,
    @Body({ schema: CreateNewsArticleDto }) createNewsArticleDto: CreateNewsArticleInput,
  ) {
    return await this.newsService.create(createNewsArticleDto, userId);
  }

  @Get()
  async findAll(
    @Query({ schema: NewsListQueryDto }) { page, limit, locale, type }: NewsListQueryInput,
  ) {
    return await this.newsService.findAllPublishedArticle(page, limit, parseLocale(locale), type);
  }

  @Get("embed/tweet")
  async embedTweet(@Query({ schema: TweetEmbedQueryDto }) { url }: TweetEmbedQueryInput) {
    return await this.tweetEmbedService.embed(url);
  }

  @Get("embed/tweet/image")
  async tweetImage(
    @Query({ schema: TweetEmbedQueryDto }) { url }: TweetEmbedQueryInput,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const image = await this.tweetImageService.load(url);
    await reply
      .header("Content-Type", image.contentType)
      .header("Cache-Control", "public, max-age=3600")
      .header("Content-Security-Policy", "default-src 'none'")
      .send(image.body);
  }

  @Get("weeks/:week")
  async findWeek(
    @Param("week") week: string,
    @Query({ schema: NewsLocaleQueryDto }) { locale }: NewsLocaleQueryInput,
  ) {
    return await this.newsService.findPublishedShortsByWeek(week, parseLocale(locale));
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("news.manage")
  @Get("admin")
  async findAllAdmin(@Query({ schema: PaginationQueryDto }) { page, limit }: PaginationQueryInput) {
    return await this.newsService.findAll(page, limit);
  }

  @Get(":slug")
  async findOne(
    @Param("slug") slug: string,
    @Query({ schema: NewsLocaleQueryDto }) { locale }: NewsLocaleQueryInput,
  ) {
    return await this.newsService.findOneBySlug(slug, parseLocale(locale));
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("news.manage")
  @Get("admin/:slug")
  async findOneAdmin(@Param("slug") slug: string) {
    return await this.newsService.findOneAdminBySlug(slug);
  }

  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions("news.manage")
  @Patch(":slug")
  async update(
    @Param("slug") slug: string,
    @Body({ schema: UpdateNewsArticleDto }) dto: UpdateNewsArticleInput,
  ) {
    return await this.newsService.update(slug, dto);
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
    @Body({ schema: ReplyContentDto }) dto: ReplyContentInput,
  ) {
    const articleId = await this.newsService.findArticleIdBySlug(slug);

    const reply = await this.replyService.create(userId, {
      ...dto,
      newsArticleId: articleId,
    });

    return { reply };
  }
}
