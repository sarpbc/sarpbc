import { Controller, Get, Param } from "@nestjs/common";
import { SITEMAP_KINDS, type SitemapKind } from "@sarpbc/types";
import { NotFoundError } from "../../../common/domain/errors/not-found-error";
import { SitemapService } from "../../application/sitemap.service";

function isSitemapKind(value: string): value is SitemapKind {
  return SITEMAP_KINDS.some((kind) => kind === value);
}

@Controller("sitemap")
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Get(":kind")
  async entries(@Param("kind") kind: string) {
    if (!isSitemapKind(kind)) {
      throw new NotFoundError(`Sitemap "${kind}" was not found.`);
    }

    return await this.sitemapService.entries(kind);
  }
}
