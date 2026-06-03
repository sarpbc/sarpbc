import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { NewsArticle } from "./domain/news-article.entity";
import { NewsController } from "./news.controller";
import { NewsService } from "./news.service";
import { ReplyModule } from "../reply/reply.module";
import { UserModule } from "src/user/user.module";

@Module({
  imports: [MikroOrmModule.forFeature([NewsArticle]), ReplyModule, UserModule],
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
