import { Module } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { NewsArticle } from "./persistence/news-article.entity";
import { UserModule } from "../../user/infrastructure/user.module";
import { ReplyModule } from "../../reply/infrastructure/reply.module";
import { ReplyService } from "../../reply/application/reply.service";
import { NewsController } from "./http/news.controller";
import { NewsService } from "../application/news.service";
import { TweetEmbedService } from "../application/tweet-embed.service";
import { TweetOEmbedGateway } from "./tweet-oembed.gateway";
import { MikroNewsStore } from "./persistence/news.store";
import { transactionalNews } from "./composition";
import { IndexNowService } from "./indexnow.service";
@Module({
  imports: [MikroOrmModule.forFeature([NewsArticle]), UserModule, ReplyModule],
  controllers: [NewsController],
  providers: [
    IndexNowService,
    {
      provide: NewsService,
      useFactory: (em: EntityManager, replies: ReplyService, indexing: IndexNowService) =>
        new NewsService(new MikroNewsStore(em), transactionalNews(em), replies, indexing),
      inject: [EntityManager, ReplyService, IndexNowService],
    },
    {
      provide: TweetEmbedService,
      useFactory: () => new TweetEmbedService(new TweetOEmbedGateway()),
    },
  ],
  exports: [NewsService],
})
export class NewsModule {}
