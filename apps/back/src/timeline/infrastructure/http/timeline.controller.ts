import type { TimelineEntry } from "@sarpbc/types";
import { Controller, Get, Header } from "@nestjs/common";
import { TimelineService } from "../../application/timeline.service";

@Controller("timeline")
export class TimelineController {
  constructor(private readonly timeline: TimelineService) {}

  @Get()
  @Header("Cache-Control", "public, max-age=300")
  async list() {
    return { entries: await this.timeline.publicEntries() } satisfies {
      entries: TimelineEntry[];
    };
  }
}
