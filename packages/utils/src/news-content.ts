import { replaceNewsEntityTagsWithLabels } from "./news-entity-tag";
import { stripNewsMatchTags } from "./news-match-block";
import { stripNewsTweetTags } from "./news-tweet-tag";

export const NEWS_EXCERPT_MAX_LENGTH = 120;
export const NEWS_SEO_DESCRIPTION_MAX_LENGTH = 160;

export function newsContentToPlainText(content: string): string {
  const withLabels = replaceNewsEntityTagsWithLabels(
    stripNewsMatchTags(stripNewsTweetTags(content)),
  );

  return withLabels
    .replaceAll(/```[\s\S]*?```/g, " ")
    .replaceAll(/`(?<code>[^`]+)`/g, "$<code>")
    .replaceAll(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replaceAll(/\[(?<text>[^\]]+)\]\([^)]*\)/g, "$<text>")
    .replaceAll(/^#{1,6}\s+/gm, "")
    .replaceAll(/^\s*>\s?/gm, "")
    .replaceAll(/^\s*[-*+]\s+/gm, "")
    .replaceAll(/^\s*\d+\.\s+/gm, "")
    .replaceAll("|", " ")
    .replaceAll(/[*_~]+/g, "")
    .replaceAll(/\s+/g, " ")
    .trim();
}

export function excerptFromNewsContent(
  content: string,
  maxLength = NEWS_EXCERPT_MAX_LENGTH,
): string {
  const plain = newsContentToPlainText(content);

  if (plain.length <= maxLength) {
    return plain;
  }

  return `${plain.slice(0, maxLength).trimEnd()}…`;
}
