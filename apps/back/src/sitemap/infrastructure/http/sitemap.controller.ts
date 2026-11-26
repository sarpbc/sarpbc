import { Controller, Get, Param } from "@nestjs/common";
import { SITEMAP_KINDS } from "@sarpbc/types";
import { NotFoundError } from "../../../common/domain/errors/not-found-error";
import { SitemapService } from "../../application/sitemap.service";

@Controller("sitemap")
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Get(":kind")
  async entries(@Param("kind") requested: string) {
    // WARNING: only the matched constant goes on, so the request value never reaches the response.
    const kind = SITEMAP_KINDS.find((candidate) => candidate === requested);

    if (kind === undefined) {
      throw new NotFoundError("This sitemap does not exist.");
    }

    return await this.sitemapService.entries(kind);
  }
}
