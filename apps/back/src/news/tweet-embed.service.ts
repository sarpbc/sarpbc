import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { parseTweetUrl, type ParsedTweetUrl, type TweetEmbed } from "@sarpbc/utils";
import { tweetEmbedFromOEmbed, type TweetOEmbedResponse } from "./tweet-oembed.util";

const OEMBED_ENDPOINT = "https://publish.x.com/oembed";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4_000;

interface CacheEntry {
  embed: TweetEmbed;
  expiresAt: number;
}

@Injectable()
export class TweetEmbedService {
  private readonly cache = new Map<string, CacheEntry>();

  async embed(url: string): Promise<TweetEmbed> {
    const parsed = parseTweetUrl(url);
    if (!parsed) {
      throw new BadRequestException("Paste a full X or Twitter post URL (x.com/.../status/...).");
    }

    const cached = this.cache.get(parsed.id);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.embed;
    }

    const embed = await this.fetchOEmbed(parsed);
    this.cache.set(parsed.id, { embed, expiresAt: Date.now() + CACHE_TTL_MS });
    return embed;
  }

  private async fetchOEmbed(parsed: ParsedTweetUrl): Promise<TweetEmbed> {
    const oembedUrl = new URL(OEMBED_ENDPOINT);
    oembedUrl.searchParams.set("url", parsed.url);
    oembedUrl.searchParams.set("omit_script", "true");
    oembedUrl.searchParams.set("dnt", "true");
    oembedUrl.searchParams.set("hide_thread", "true");

    let response: Response;
    try {
      response = await fetch(oembedUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": "sarpbc-news-embed/1.0 (+https://sarpbc.org)",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch {
      throw new ServiceUnavailableException(
        "Could not load this post from X. Try again in a moment.",
      );
    }

    if (response.status === 404) {
      throw new NotFoundException(
        "This X post is unavailable. Use another URL, or link to it in the article.",
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        "Could not load this post from X. Try again in a moment.",
      );
    }

    const payload = (await response.json()) as TweetOEmbedResponse;
    const embed = tweetEmbedFromOEmbed(parsed, payload);
    if (!embed) {
      throw new NotFoundException(
        "This X post is unavailable. Use another URL, or link to it in the article.",
      );
    }

    return embed;
  }
}
