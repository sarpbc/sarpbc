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
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\|/g, " ")
    .replace(/[*_~]+/g, "")
    .replace(/\s+/g, " ")
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
