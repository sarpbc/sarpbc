import { Module } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { SitemapService } from "../application/sitemap.service";
import { SitemapController } from "./http/sitemap.controller";
import { SitemapStore } from "./persistence/sitemap.store";

@Module({
  controllers: [SitemapController],
  providers: [
    {
      provide: SitemapService,
      useFactory: (em: EntityManager) => new SitemapService(new SitemapStore(em)),
      inject: [EntityManager],
    },
  ],
})
export class SitemapModule {}
