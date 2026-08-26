const DANGEROUS_BLOCKS =
  /<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi;

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

const NEWS_ALLOWED_ATTRS: Record<string, ReadonlySet<string>> = {
  a: new Set(["href", "title", "rel", "target"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
};

function isSafeUrl(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return (
    trimmed.startsWith("https:") ||
    trimmed.startsWith("http:") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("/")
  );
}

function stripDangerousBlocks(value: string): string {
  return value.replace(DANGEROUS_BLOCKS, "");
}

export function sanitizePlainText(value: string): string {
  return stripDangerousBlocks(value).replace(/<[^>]+>/g, "");
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

      const allowed = NEWS_ALLOWED_ATTRS[name];
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
