const SKIP_PREFIXES = ["/_nuxt", "/__nuxt", "/og/", "/_ipx", "/_icon"];

const STATIC_EXTENSIONS = new Set([
  "css",
  "gif",
  "ico",
  "jpg",
  "jpeg",
  "js",
  "json",
  "map",
  "mjs",
  "png",
  "svg",
  "txt",
  "webp",
  "woff",
  "woff2",
  "xml",
]);

function lastSegment(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  const slash = trimmed.lastIndexOf("/");
  return slash === -1 ? trimmed : trimmed.slice(slash + 1);
}

export function isInternalOrAssetPath(pathname: string): boolean {
  if (SKIP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return true;
  }

  const segment = lastSegment(pathname);
  const dot = segment.lastIndexOf(".");
  if (dot <= 0) {
    return false;
  }

  const ext = segment.slice(dot + 1).toLowerCase();
  return STATIC_EXTENSIONS.has(ext);
}

const PRIVATE_HTML_PATHS = new Set([
  "/login",
  "/register",
  "/profile",
  "/fr/login",
  "/fr/register",
  "/fr/profile",
]);

export function isMarkdownPagePath(pathname: string): boolean {
  if (!pathname.endsWith(".md")) {
    return false;
  }

  return !isInternalOrAssetPath(pathname.replace(/\.md$/, ""));
}

export function isMarkdownEligibleHtmlPath(pathname: string): boolean {
  if (isInternalOrAssetPath(pathname) || pathname.endsWith(".md")) {
    return false;
  }

  const normalized = pathname.replace(/\/+$/, "") || "/";
  return !PRIVATE_HTML_PATHS.has(normalized);
}

export function htmlPathFromMarkdownPath(pathname: string): string {
  const withoutMd = pathname.endsWith(".md") ? pathname.slice(0, -3) : pathname;

  if (withoutMd === "/index" || withoutMd === "") {
    return "/";
  }
  if (withoutMd === "/fr/index") {
    return "/fr";
  }
  return withoutMd || "/";
}

export function markdownPathFromHtmlPath(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/") {
    return "/index.md";
  }
  if (normalized === "/fr") {
    return "/fr/index.md";
  }
  return `${normalized}.md`;
}
