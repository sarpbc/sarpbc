import type { SeasonArchive, SeasonArchiveSummary } from "@sarpbc/types";
import { Controller, Get, Header, Param } from "@nestjs/common";
import { SeasonArchiveService } from "../../application/season-archive.service";

@Controller("season-archives")
export class SeasonArchiveController {
  constructor(private readonly archives: SeasonArchiveService) {}

  @Get()
  @Header("Cache-Control", "public, max-age=60")
  async list() {
    return { seasons: await this.archives.published() } satisfies {
      seasons: SeasonArchiveSummary[];
    };
  }

  @Get(":slug")
  @Header("Cache-Control", "public, max-age=60")
  async archive(@Param("slug") slug: string) {
    return (await this.archives.archive(slug)) satisfies SeasonArchive;
  }
}
