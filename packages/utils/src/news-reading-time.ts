import { newsContentToPlainText } from "./news-content";

const WORDS_PER_MINUTE = 200;

export function readingTimeMinutes(content: string): number {
  const words = newsContentToPlainText(content).split(/\s+/u).filter(Boolean).length;

  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
