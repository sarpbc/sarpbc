import { parseTweetUrl, type ParsedTweetUrl, type TweetEmbed } from "@sarpbc/utils";
import { InvalidInputError } from "../../common/domain/errors";
export interface TweetEmbedGateway {
  load(parsed: ParsedTweetUrl): Promise<TweetEmbed>;
}
export class TweetEmbedService {
  constructor(private readonly gateway: TweetEmbedGateway) {}
  async embed(url: string): Promise<TweetEmbed> {
    const parsed = parseTweetUrl(url);
    if (!parsed)
      throw new InvalidInputError("Paste a full X or Twitter post URL (x.com/.../status/...).");
    return this.gateway.load(parsed);
  }
}
