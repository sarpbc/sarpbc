import { isTweetImageUrl } from "@sarpbc/utils";
import { InvalidInputError } from "../../common/domain/errors";
export interface TweetImage {
  contentType: string;
  body: Uint8Array;
}
export interface TweetImageGateway {
  load(url: string): Promise<TweetImage>;
}
export class TweetImageService {
  constructor(private readonly gateway: TweetImageGateway) {}
  async load(url: string): Promise<TweetImage> {
    if (!isTweetImageUrl(url))
      throw new InvalidInputError("Only https://pbs.twimg.com images from X posts can be loaded.");
    return this.gateway.load(url);
  }
}
