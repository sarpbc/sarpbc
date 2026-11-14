import { parseTweetUrl } from "@sarpbc/utils";
import type { ParsedTweetUrl, TweetEmbed } from "@sarpbc/utils";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";

export interface TweetEmbedGateway {
  load(parsed: ParsedTweetUrl): Promise<TweetEmbed>;
}

export class TweetEmbedService {
  constructor(private readonly gateway: TweetEmbedGateway) {}
  async embed(url: string): Promise<TweetEmbed> {
    const parsed = parseTweetUrl(url);

    if (!parsed) {
      throw new InvalidInputError("Paste a full X or Twitter post URL (x.com/.../status/...).");
    }

    return await this.gateway.load(parsed);
  }
}
