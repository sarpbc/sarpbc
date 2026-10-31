import { NEWS_MATCH_BLOCK_MAX_MATCHES, findInvalidNewsMatchTags } from "@sarpbc/utils";
import { InvalidInputError } from "../../common/domain/errors";

export {
  excerptFromNewsContent as excerptFromContent,
  newsContentToPlainText as stripMarkdownToPlain,
} from "@sarpbc/utils";

export function assertValidMatchBlocks(content: string): void {
  const [invalid] = findInvalidNewsMatchTags(content);
  if (invalid !== undefined) {
    throw new InvalidInputError(
      `Invalid match block ${invalid}. Use :matches{match="<match id>"}, :matches{ids="<match id>,<match id>"}, :matches{tournament="<tournament id>" limit="5"} or :matches{team="<team id>" limit="5"} with UUIDs and at most ${NEWS_MATCH_BLOCK_MAX_MATCHES} matches.`,
    );
  }
}
