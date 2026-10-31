const RAW_TEXT_ELEMENTS = ["script", "style"] as const;

type RawTextElement = (typeof RAW_TEXT_ELEMENTS)[number];

const NEWS_ALLOWED_TAGS = new Set([
  "p",
  "br",
  "b",
  "i",
  "em",
  "strong",
  "a",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "code",
  "pre",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "caption",
]);

const NEWS_ALLOWED_ATTRS = {
  a: new Set(["href", "title", "rel", "target"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
} as const;

function isSafeUrl(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return (
    trimmed.startsWith("https:") ||
    trimmed.startsWith("http:") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("/")
  );
}

function asciiLowerCase(value: string): string {
  return value.replace(/[A-Z]/g, (char) => char.toLowerCase());
}

function isWordChar(char: string): boolean {
  return /\w/.test(char);
}

function rawTextElementAt(lower: string, index: number): RawTextElement | null {
  for (const name of RAW_TEXT_ELEMENTS) {
    if (lower.startsWith(`<${name}`, index) && !isWordChar(lower.charAt(index + name.length + 1))) {
      return name;
    }
  }
  return null;
}

function findEndTag(lower: string, name: RawTextElement, from: number): number {
  let index = lower.indexOf(`</${name}`, from);
  while (index !== -1) {
    if (/^[\t\n\f\r />]$/.test(lower.charAt(index + name.length + 2))) {
      return index;
    }
    index = lower.indexOf(`</${name}`, index + 1);
  }
  return -1;
}

function stripDangerousBlocks(value: string): string {
  const lower = asciiLowerCase(value);
  const unclosed = new Set<RawTextElement | "comment">();
  let result = "";
  let copiedUntil = 0;
  let index = lower.indexOf("<");

  while (index !== -1) {
    let blockEnd = -1;
    const element = rawTextElementAt(lower, index);

    if (element !== null && !unclosed.has(element)) {
      const startTagEnd = lower.indexOf(">", index);
      if (startTagEnd === -1) {
        break;
      }
      const endTag = findEndTag(lower, element, startTagEnd + 1);
      const endTagEnd = endTag === -1 ? -1 : lower.indexOf(">", endTag);
      if (endTagEnd === -1) {
        unclosed.add(element);
      } else {
        blockEnd = endTagEnd + 1;
      }
    } else if (lower.startsWith("<!--", index) && !unclosed.has("comment")) {
      const commentEnd = lower.indexOf("-->", index + 4);
      if (commentEnd === -1) {
        unclosed.add("comment");
      } else {
        blockEnd = commentEnd + 3;
      }
    }

    if (blockEnd === -1) {
      index = lower.indexOf("<", index + 1);
      continue;
    }
    result += value.slice(copiedUntil, index);
    copiedUntil = blockEnd;
    index = lower.indexOf("<", blockEnd);
  }

  return result + value.slice(copiedUntil);
}

function stripTags(value: string): string {
  let result = "";
  let copiedUntil = 0;
  let index = value.indexOf("<");

  while (index !== -1) {
    const tagEnd = value.indexOf(">", index + 1);
    if (tagEnd === -1) {
      break;
    }
    if (tagEnd > index + 1) {
      result += value.slice(copiedUntil, index);
      copiedUntil = tagEnd + 1;
    }
    index = value.indexOf("<", tagEnd + 1);
  }

  return result + value.slice(copiedUntil);
}

export function sanitizePlainText(value: string): string {
  return stripTags(stripDangerousBlocks(value));
}

export function sanitizeNewsHtml(value: string): string {
  return stripDangerousBlocks(value).replace(
    /<\/?([a-zA-Z][\w:-]*)\b([^>]*)>/g,
    (full: string, rawName: string, rawAttrs: string) => {
      const name = rawName.toLowerCase();
      if (!NEWS_ALLOWED_TAGS.has(name)) {
        return "";
      }
      if (full.startsWith("</")) {
        return `</${name}>`;
      }

      const allowed =
        name === "a" || name === "img" || name === "td" || name === "th"
          ? NEWS_ALLOWED_ATTRS[name]
          : undefined;
      if (!allowed) {
        return `<${name}>`;
      }

      const attrs: string[] = [];
      const attrRe = /([a-zA-Z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)'|(\S+))/g;
      let match = attrRe.exec(rawAttrs);
      while (match) {
        const attrName = match[1].toLowerCase();
        const attrValue = match[3] ?? match[4] ?? match[5] ?? "";
        match = attrRe.exec(rawAttrs);

        if (!allowed.has(attrName) || attrName.startsWith("on")) {
          continue;
        }
        if ((attrName === "href" || attrName === "src") && !isSafeUrl(attrValue)) {
          continue;
        }
        attrs.push(`${attrName}="${attrValue.replaceAll('"', "&quot;")}"`);
      }

      const attrString = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
      return `<${name}${attrString}>`;
    },
  );
}
