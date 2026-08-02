const EXCERPT_MAX_LENGTH = 120;

export function stripMarkdownToPlain(content: string): string {
  return content
    .replace(/[#>*_`[\]()!\\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerptFromContent(content: string, maxLength = EXCERPT_MAX_LENGTH): string {
  const plain = stripMarkdownToPlain(content);
  if (plain.length <= maxLength) {
    return plain;
  }
  return `${plain.slice(0, maxLength).trimEnd()}…`;
}
