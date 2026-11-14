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
    .replaceAll(/```[\s\S]*?```/gu, " ")
    .replaceAll(/`(?<code>[^`]+)`/gu, "$<code>")
    .replaceAll(/!\[[^\]]*\]\([^)]*\)/gu, " ")
    .replaceAll(/\[(?<text>[^\]]+)\]\([^)]*\)/gu, "$<text>")
    .replaceAll(/^#{1,6}\s+/gmu, "")
    .replaceAll(/^\s*>\s?/gmu, "")
    .replaceAll(/^\s*[-*+]\s+/gmu, "")
    .replaceAll(/^\s*\d+\.\s+/gmu, "")
    .replaceAll("|", " ")
    .replaceAll(/[*_~]+/gu, "")
    .replaceAll(/\s+/gu, " ")
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
