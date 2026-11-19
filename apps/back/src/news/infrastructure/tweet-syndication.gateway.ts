import { z } from "zod";
import type { ParsedTweetUrl, TweetEmbed } from "@sarpbc/utils";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { IntegrationError } from "../../common/domain/errors/integration-error";
import type { TweetEmbedGateway } from "../application/tweet-embed.service";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4000;
const imageUrl = z.url().startsWith("https://pbs.twimg.com/");

const unavailableTweetSchema = z.union([
  z.strictObject({}),
  z.object({ __typename: z.literal("TweetTombstone") }),
]);

const tweetSchema = z.object({
  __typename: z.literal("Tweet"),
  created_at: z.iso.datetime(),
  display_text_range: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]),
  id_str: z.string(),
  mediaDetails: z
    .array(
      z.object({
        ext_alt_text: z.string().optional(),
        media_url_https: imageUrl,
        original_info: z.object({ height: z.number().positive(), width: z.number().positive() }),
        type: z.enum(["photo", "video", "animated_gif"]),
        url: z.string(),
      }),
    )
    .default([]),
  text: z.string(),
  user: z.object({
    name: z.string(),
    profile_image_url_https: imageUrl.optional().catch(undefined),
    screen_name: z.string().regex(/^[A-Za-z0-9_]{1,15}$/u),
  }),
});

interface CacheEntry {
  embed: TweetEmbed;
  expiresAt: number;
}

export class TweetSyndicationGateway implements TweetEmbedGateway {
  private readonly cache = new Map<string, CacheEntry>();

  async load(parsed: ParsedTweetUrl) {
    const cached = this.cache.get(parsed.id);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.embed;
    }

    const embed = await this.fetchTweet(parsed);
    this.cache.set(parsed.id, { embed, expiresAt: Date.now() + CACHE_TTL_MS });

    return embed;
  }

  private async fetchTweet(parsed: ParsedTweetUrl) {
    const url = new URL("https://cdn.syndication.twimg.com/tweet-result");
    url.searchParams.set("id", parsed.id);
    url.searchParams.set("lang", "en");
    // WARNING: the X syndication endpoint requires this token, also used by vercel/react-tweet.
    url.searchParams.set(
      "token",
      ((Number(parsed.id) / 1e15) * Math.PI).toString(36).replaceAll(/(?:0+|\.)/gu, ""),
    );

    let response: Response;
    let payload: unknown;

    try {
      response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (response.ok) {
        payload = await response.json();
      }
    } catch {
      throw new IntegrationError("Could not load this post from X. Try again in a moment.");
    }

    if (
      response.status === 404 ||
      (response.ok && unavailableTweetSchema.safeParse(payload).success)
    ) {
      throw new NotFoundError(
        "This X post is unavailable. Use another URL, or link to it in the article.",
      );
    }

    const result = tweetSchema.safeParse(payload);

    if (!response.ok || !result.success || result.data.id_str !== parsed.id) {
      throw new IntegrationError("Could not load this post from X. Try again in a moment.");
    }

    const tweet = result.data;
    let text = tweet.text.slice(...tweet.display_text_range);

    for (const media of tweet.mediaDetails) {
      text = text.replace(media.url, "");
    }

    text = text.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&").trim();

    return {
      authorHandle: tweet.user.screen_name,
      authorImageUrl: tweet.user.profile_image_url_https ?? null,
      authorName: tweet.user.name,
      authorUrl: `https://x.com/${tweet.user.screen_name}`,
      id: parsed.id,
      media: tweet.mediaDetails.map((media) => ({
        alt: media.ext_alt_text ?? "",
        height: media.original_info.height,
        type: media.type,
        url: media.media_url_https,
        width: media.original_info.width,
      })),
      postedAt: tweet.created_at,
      text,
      url: `https://x.com/${tweet.user.screen_name}/status/${parsed.id}`,
    };
  }
}
