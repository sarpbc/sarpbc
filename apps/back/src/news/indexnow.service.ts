import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { INDEXNOW_KEY, INDEXNOW_KEY_PATH } from "@sarpbc/utils";
import { createLogger } from "evlog";

@Injectable()
export class IndexNowService {
  constructor(private readonly configService: ConfigService) {}

  async submitNewsSlugs(slugs: string[]): Promise<void> {
    if (!this.configService.get<boolean>("production") || slugs.length === 0) {
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
          key: INDEXNOW_KEY,
          keyLocation: `${origin}${INDEXNOW_KEY_PATH}`,
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
