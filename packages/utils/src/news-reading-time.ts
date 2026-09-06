import { newsContentToPlainText } from "./news-content.ts";

const WORDS_PER_MINUTE = 200;

export function readingTimeMinutes(content: string): number {
  const words = newsContentToPlainText(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
