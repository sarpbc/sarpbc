import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityRepository } from "@mikro-orm/postgresql";
import { NewsArticle } from "./domain/news-article.entity";
import { CreateNewsArticleDto } from "./dto/create-news-article.dto";
import { UpdateNewsArticleDto } from "./dto/update-news-article.dto";
import { excerptFromContent } from "./news-content.util";
import { hasFrenchTranslation, localizedNewsFields, type NewsLocale } from "./news-locale.util";
import { UserService } from "src/user/user.service";
import { ReplyService } from "src/reply/reply.service";
import slugify from "slugify";

export interface NewsArticleListItemResponse {
  id: string;
  title: string;
  slug: string;
  createdAt: Date;
  imageUrl: string | null;
  excerpt: string;
  commentCount: number;
}

export interface NewsArticleResponse {
  id: string;
  author: string;
  title: string;
  slug: string;
  content: string;
  createdAt: Date;
  isDraft: boolean;
  imageUrl: string | null;
}

interface NewsArticleAdminResponse extends NewsArticleResponse {
  titleFr: string | null;
  contentFr: string | null;
  hasFrench: boolean;
}

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(NewsArticle)
    private readonly newsRepository: EntityRepository<NewsArticle>,
    private readonly userService: UserService,
    private readonly replyService: ReplyService,
  ) {}

  private mapListArticle(
    article: NewsArticle,
    locale: NewsLocale,
    commentCount = 0,
  ): NewsArticleListItemResponse {
    const { title, content } = localizedNewsFields(article, locale);
    return {
      id: article.id,
      title,
      slug: article.slug,
      createdAt: article.createdAt,
      imageUrl: article.imageUrl,
      excerpt: excerptFromContent(content),
      commentCount,
    };
  }

  private mapArticle(article: NewsArticle, locale: NewsLocale): NewsArticleResponse {
    const { title, content } = localizedNewsFields(article, locale);
    return {
      id: article.id,
      author: article.author.userName,
      title,
      slug: article.slug,
      content,
      createdAt: article.createdAt,
      isDraft: article.isDraft,
      imageUrl: article.imageUrl,
    };
  }

  private mapAdminArticle(article: NewsArticle): NewsArticleAdminResponse {
    return {
      ...this.mapArticle(article, "en-US"),
      titleFr: article.titleFr,
      contentFr: article.contentFr,
      hasFrench: hasFrenchTranslation(article),
    };
  }

  private normalizeSlug(value: string): string {
    return slugify(value, { lower: true, strict: true });
  }

  private async generateUniqueSlug(source: string): Promise<string> {
    const base = this.normalizeSlug(source);
    if (!base) {
      throw new ConflictException(
        "Could not generate a URL slug from that title. Add a slug manually (letters, numbers, hyphens).",
      );
    }
    let slug = base;
    let suffix = 1;
    while (await this.newsRepository.findOne({ slug })) {
      slug = `${base}-${suffix++}`;
    }
    return slug;
  }

  private async assertSlugAvailable(slug: string, excludeArticleId?: string): Promise<void> {
    const existing = await this.newsRepository.findOne({ slug });
    if (existing && existing.id !== excludeArticleId) {
      throw new ConflictException(
        `An article with the slug "${slug}" already exists. Choose a different slug.`,
      );
    }
  }

  async create(dto: CreateNewsArticleDto, userId: string): Promise<NewsArticleAdminResponse> {
    const author = await this.userService.findById(userId);
    if (!author) {
      throw new NotFoundException(`User with id "${userId}" not found`);
    }

    let slug: string;
    if (dto.slug) {
      slug = this.normalizeSlug(dto.slug);
      if (!slug) {
        throw new ConflictException(
          "Enter a valid slug using letters, numbers, and hyphens (e.g. my-article).",
        );
      }
      await this.assertSlugAvailable(slug);
    } else {
      slug = await this.generateUniqueSlug(dto.title);
    }

    const article = this.newsRepository.create({
      title: dto.title,
      content: dto.content,
      titleFr: dto.titleFr ?? null,
      contentFr: dto.contentFr ?? null,
      author,
      slug,
      isDraft: true,
      imageUrl: dto.imageUrl ?? null,
      createdAt: new Date(),
    });
    await this.newsRepository.getEntityManager().persist(article).flush();
    return this.mapAdminArticle(article);
  }

  async findAllPublishedArticle(
    page: number,
    limit: number,
    locale: NewsLocale = "en-US",
  ): Promise<{
    data: NewsArticleListItemResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const offset = page * limit;
    const [articles, total] = await this.newsRepository.findAndCount(
      { isDraft: false },
      { orderBy: { createdAt: "DESC" }, limit, offset },
    );
    const commentCounts = await this.replyService.countByTargetIds(
      "newsArticle",
      articles.map((article) => article.id),
    );
    return {
      data: articles.map((article) =>
        this.mapListArticle(article, locale, commentCounts.get(article.id) ?? 0),
      ),
      total,
      page,
      limit,
    };
  }

  async findAll(
    page: number,
    limit: number,
  ): Promise<{
    data: NewsArticleAdminResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const offset = page * limit;
    const [articles, total] = await this.newsRepository.findAndCount(
      {},
      { populate: ["author"], orderBy: { createdAt: "DESC" }, limit, offset },
    );
    return {
      data: articles.map((a) => this.mapAdminArticle(a)),
      total,
      page,
      limit,
    };
  }

  async findOneBySlug(slug: string, locale: NewsLocale = "en-US"): Promise<NewsArticleResponse> {
    const article = await this.newsRepository.findOne({ slug }, { populate: ["author"] });
    if (!article) {
      throw new NotFoundException(`NewsArticle with slug "${slug}" not found`);
    }
    return this.mapArticle(article, locale);
  }

  async findOneAdminBySlug(slug: string): Promise<NewsArticleAdminResponse> {
    const article = await this.newsRepository.findOne({ slug }, { populate: ["author"] });
    if (!article) {
      throw new NotFoundException(`NewsArticle with slug "${slug}" not found`);
    }
    return this.mapAdminArticle(article);
  }

  async findArticleIdBySlug(slug: string): Promise<string> {
    const article = await this.newsRepository.findOne({ slug });
    if (!article) {
      throw new NotFoundException(`NewsArticle with slug "${slug}" not found`);
    }
    return article.id;
  }

  async update(slug: string, dto: UpdateNewsArticleDto): Promise<NewsArticleAdminResponse> {
    const article = await this.newsRepository.findOne({ slug }, { populate: ["author"] });
    if (!article) {
      throw new NotFoundException(`NewsArticle with slug "${slug}" not found`);
    }
    if (dto.title !== undefined) {
      article.title = dto.title;
    }
    if (dto.content !== undefined) {
      article.content = dto.content;
    }
    if (dto.titleFr !== undefined) {
      article.titleFr = dto.titleFr;
    }
    if (dto.contentFr !== undefined) {
      article.contentFr = dto.contentFr;
    }
    if (dto.imageUrl !== undefined) {
      article.imageUrl = dto.imageUrl ?? null;
    }
    if (dto.slug !== undefined) {
      const nextSlug = this.normalizeSlug(dto.slug);
      if (!nextSlug) {
        throw new ConflictException(
          "Enter a valid slug using letters, numbers, and hyphens (e.g. my-article).",
        );
      }
      if (nextSlug !== article.slug) {
        await this.assertSlugAvailable(nextSlug, article.id);
        article.slug = nextSlug;
      }
    }
    await this.newsRepository.getEntityManager().flush();
    return this.mapAdminArticle(article);
  }

  async setDraftStatus(slug: string, isDraft: boolean) {
    const article = await this.newsRepository.findOne({ slug }, { populate: ["author"] });
    if (!article) {
      throw new NotFoundException(`NewsArticle with slug "${slug}" not found`);
    }
    article.isDraft = isDraft;
    await this.newsRepository.getEntityManager().flush();
  }
}
