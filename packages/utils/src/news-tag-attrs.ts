export interface NewsTagAttr {
  name: string;
  value: string;
}

const WORD_CHAR = /\w/;
const ESCAPABLE_CHAR = /./;

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && WORD_CHAR.test(char);
}

function findClosingQuote(raw: string, from: number): number {
  let index = from;
  while (index < raw.length) {
    const char = raw[index];
    if (char === '"') {
      return index;
    }
    if (char === "\\") {
      const escaped = raw[index + 1];
      if (escaped === undefined || !ESCAPABLE_CHAR.test(escaped)) {
        return -1;
      }
      index += 2;
      continue;
    }
    index += 1;
  }
  return -1;
}

function unescapeAttrValue(value: string): string {
  return value.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

export function parseNewsTagAttrs(raw: string): NewsTagAttr[] {
  const attrs: NewsTagAttr[] = [];
  let index = 0;
  while (index < raw.length) {
    if (!isWordChar(raw[index])) {
      index += 1;
      continue;
    }
    let nameEnd = index;
    while (isWordChar(raw[nameEnd])) {
      nameEnd += 1;
    }
    if (raw[nameEnd] === "=" && raw[nameEnd + 1] === '"') {
      const closingQuote = findClosingQuote(raw, nameEnd + 2);
      if (closingQuote !== -1) {
        attrs.push({
          name: raw.slice(index, nameEnd),
          value: unescapeAttrValue(raw.slice(nameEnd + 2, closingQuote)),
        });
        index = closingQuote + 1;
        continue;
      }
    }
    index = nameEnd;
  }
  return attrs;
}
