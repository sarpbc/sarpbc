import { Controller, Get, Header, Param } from "@nestjs/common";
import type { SeasonArchive, SeasonArchiveSummary } from "@sarpbc/types";
import { SeasonArchiveService } from "../../application/season-archive.service";

@Controller("season-archives")
export class SeasonArchiveController {
  constructor(private readonly archives: SeasonArchiveService) {}

  @Get()
  @Header("Cache-Control", "public, max-age=60")
  async list(): Promise<{ seasons: SeasonArchiveSummary[] }> {
    return { seasons: await this.archives.published() };
  }

  @Get(":slug")
  @Header("Cache-Control", "public, max-age=60")
  async archive(@Param("slug") slug: string): Promise<SeasonArchive> {
    return await this.archives.archive(slug);
  }
}
