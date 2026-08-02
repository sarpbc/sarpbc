import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityRepository } from "@mikro-orm/postgresql";
import { NewsArticle } from "./domain/news-article.entity";
import { CreateNewsArticleDto } from "./dto/create-news-article.dto";
import { UpdateNewsArticleDto } from "./dto/update-news-article.dto";
import { excerptFromContent } from "./news-content.util";
import { UserService } from "src/user/user.service";
import slugify from "slugify";

export interface NewsArticleListItemResponse {
  id: string;
  title: string;
  slug: string;
  createdAt: Date;
  imageUrl: string | null;
  excerpt: string;
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

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(NewsArticle)
    private readonly newsRepository: EntityRepository<NewsArticle>,
    private readonly userService: UserService,
  ) {}

  private mapListArticle(article: NewsArticle): NewsArticleListItemResponse {
    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      createdAt: article.createdAt,
      imageUrl: article.imageUrl,
      excerpt: excerptFromContent(article.content),
    };
  }

  private mapArticle(article: NewsArticle): NewsArticleResponse {
    return {
      id: article.id,
      author: article.author.userName,
      title: article.title,
      slug: article.slug,
      content: article.content,
      createdAt: article.createdAt,
      isDraft: article.isDraft,
      imageUrl: article.imageUrl,
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

  async create(dto: CreateNewsArticleDto, userId: string): Promise<NewsArticleResponse> {
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
      author,
      slug,
      isDraft: true,
      imageUrl: dto.imageUrl ?? null,
      createdAt: new Date(),
    });
    await this.newsRepository.getEntityManager().persist(article).flush();
    return this.mapArticle(article);
  }

  async findAllPublishedArticle(
    page: number,
    limit: number,
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
    return {
      data: articles.map((a) => this.mapListArticle(a)),
      total,
      page,
      limit,
    };
  }

  async findAll(
    page: number,
    limit: number,
  ): Promise<{
    data: NewsArticleResponse[];
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
      data: articles.map((a) => this.mapArticle(a)),
      total,
      page,
      limit,
    };
  }

  async findOneBySlug(slug: string): Promise<NewsArticleResponse> {
    const article = await this.newsRepository.findOne({ slug }, { populate: ["author"] });
    if (!article) {
      throw new NotFoundException(`NewsArticle with slug "${slug}" not found`);
    }
    return this.mapArticle(article);
  }

  async findArticleIdBySlug(slug: string): Promise<string> {
    const article = await this.newsRepository.findOne({ slug });
    if (!article) {
      throw new NotFoundException(`NewsArticle with slug "${slug}" not found`);
    }
    return article.id;
  }

  async update(slug: string, dto: UpdateNewsArticleDto): Promise<NewsArticleResponse> {
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
    return this.mapArticle(article);
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
