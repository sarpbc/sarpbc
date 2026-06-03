import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityRepository } from "@mikro-orm/postgresql";
import { NewsArticle } from "./domain/news-article.entity";
import { CreateNewsArticleDto } from "./dto/create-news-article.dto";
import { UpdateNewsArticleDto } from "./dto/update-news-article.dto";
import { UserService } from "src/user/user.service";
import slugify from "slugify";

export interface NewsArticleResponse {
  id: string;
  author: string;
  title: string;
  slug: string;
  content: string;
  createdAt: Date;
  isDraft: boolean;
}

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(NewsArticle)
    private readonly newsRepository: EntityRepository<NewsArticle>,
    private readonly userService: UserService,
  ) {}

  private mapArticle(article: NewsArticle): NewsArticleResponse {
    return {
      id: article.id,
      author: article.author.userName,
      title: article.title,
      slug: article.slug,
      content: article.content,
      createdAt: article.createdAt,
      isDraft: article.isDraft,
    };
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = slugify(title, { lower: true, strict: true });
    let slug = base;
    let suffix = 1;
    while (await this.newsRepository.findOne({ slug })) {
      slug = `${base}-${suffix++}`;
    }
    return slug;
  }

  async create(dto: CreateNewsArticleDto, userId: string) {
    const author = await this.userService.findById(userId);
    if (!author) {
      throw new NotFoundException(`User with id "${userId}" not found`);
    }
    const slug = await this.generateUniqueSlug(dto.title);
    const article = this.newsRepository.create({
      title: dto.title,
      content: dto.content,
      author,
      slug,
      isDraft: true,
      createdAt: new Date(),
    });
    await this.newsRepository.getEntityManager().persist(article).flush();
  }

  async findAllPublishedArticle(
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
      { isDraft: false },
      { populate: ["author"], orderBy: { createdAt: "DESC" }, limit, offset },
    );
    return {
      data: articles.map((a) => this.mapArticle(a)),
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
