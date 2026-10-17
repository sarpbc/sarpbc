import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createLogger } from "evlog";
import type { NewsIndexing } from "../application/ports";

@Injectable()
export class IndexNowService implements NewsIndexing {
  constructor(private readonly configService: ConfigService) {}

  async submitNewsSlugs(slugs: string[]): Promise<void> {
    const key = this.configService.get<string>("indexnow.key");
    if (!this.configService.get<boolean>("production") || !key || slugs.length === 0) {
      return;
    }

    const log = createLogger({ component: IndexNowService.name });
    try {
      const origin = new URL(this.configService.getOrThrow<string>("front_url")).origin;
      const urlList = [...new Set(slugs)].flatMap((slug) => [
        `${origin}/news/${encodeURIComponent(slug)}`,
        `${origin}/fr/news/${encodeURIComponent(slug)}`,
      ]);
      const response = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: new URL(origin).host,
          key,
          keyLocation: `${origin}/${key}.txt`,
          urlList,
        }),
        signal: AbortSignal.timeout(5000),
      });
      log.set({ urlCount: urlList.length, status: response.status });
      if (!response.ok) {
        log.warn("IndexNow submission rejected");
      }
    } catch (error) {
      log.error(error instanceof Error ? error : new Error(String(error)));
    } finally {
      log.emit();
    }
  }
}
