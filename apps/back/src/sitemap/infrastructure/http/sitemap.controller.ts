import { Controller, Get, Param } from "@nestjs/common";
import { SITEMAP_KINDS, type SitemapKind } from "@sarpbc/types";
import { NotFoundError } from "../../../common/domain/errors";
import { SitemapService } from "../../application/sitemap.service";

function isSitemapKind(value: string): value is SitemapKind {
  return (SITEMAP_KINDS as readonly string[]).includes(value);
}

@Controller("sitemap")
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Get(":kind")
  entries(@Param("kind") kind: string) {
    if (!isSitemapKind(kind)) {
      throw new NotFoundError(`Sitemap "${kind}" was not found.`);
    }

    return this.sitemapService.entries(kind);
  }
}
