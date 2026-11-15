import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { localizedPath, newsPath } from "@sarpbc/utils";
import { createLogger } from "evlog";
import type { NewsIndexing } from "../application/ports";

@Injectable()
export class IndexNowService implements NewsIndexing {
  constructor(private readonly configService: ConfigService) {}

  async submitNewsSlugs(slugs: string[]): Promise<void> {
    const key = this.configService.get<string>("indexnow.key");

    if (
      this.configService.get<boolean>("production") !== true ||
      key === undefined ||
      key === "" ||
      slugs.length === 0
    ) {
      return;
    }

    const log = createLogger({ component: IndexNowService.name });

    try {
      const { origin } = new URL(this.configService.getOrThrow<string>("front_url"));

      // The home page lists the latest news, so it changes with every article.
      const paths = ["/", ...new Set(slugs.map((slug) => newsPath(encodeURIComponent(slug))))];

      const urlList = paths.flatMap((path) => [
        `${origin}${path}`,
        `${origin}${localizedPath(path, "fr")}`,
      ]);

      const response = await fetch("https://api.indexnow.org/indexnow", {
        body: JSON.stringify({
          host: new URL(origin).host,
          key,
          keyLocation: `${origin}/${key}.txt`,
          urlList,
        }),
        headers: { "Content-Type": "application/json; charset=utf-8" },
        method: "POST",
        signal: AbortSignal.timeout(5000),
      });

      log.set({ status: response.status, urlCount: urlList.length });

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
