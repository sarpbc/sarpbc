import { htmlToMarkdown } from "@mdream/js";
import { shouldServeMarkdown } from "@mdream/js/negotiate";
import {
  htmlPathFromMarkdownPath,
  isMarkdownEligibleHtmlPath,
  isMarkdownPagePath,
  markdownPathFromHtmlPath,
} from "~/utils/markdownPath";

const INTERNAL_HEADER = "x-sarpbc-markdown-internal";

export default defineEventHandler(async (event) => {
  if (event.method !== "GET") {
    return;
  }

  if (getHeader(event, INTERNAL_HEADER)) {
    return;
  }

  const url = getRequestURL(event);
  const pathname = url.pathname;

  if (pathname.startsWith("/.well-known/")) {
    return;
  }

  if (isMarkdownPagePath(pathname)) {
    const htmlPath = htmlPathFromMarkdownPath(pathname);
    if (!isMarkdownEligibleHtmlPath(htmlPath)) {
      return;
    }

    const response = await useNitroApp().localFetch(`${htmlPath}${url.search}`, {
      method: "GET",
      headers: {
        [INTERNAL_HEADER]: "1",
        accept: "text/html",
        "sec-fetch-dest": "document",
        cookie: getHeader(event, "cookie") ?? "",
        "accept-language": getHeader(event, "accept-language") ?? "",
      },
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      setResponseStatus(event, response.status || 404);
      setHeader(event, "content-type", "text/markdown; charset=utf-8");
      setHeader(event, "x-robots-tag", "noindex");
      return "Page not found.\n";
    }

    const html = await response.text();
    const markdown = htmlToMarkdown(html, {
      origin: url.origin,
      plugins: {
        frontmatter: true,
        isolateMain: false,
        filter: {
          exclude: ["header", "footer", "form", "script", "style", "noscript"],
        },
      },
    });

    setHeader(event, "content-type", "text/markdown; charset=utf-8");
    setHeader(event, "vary", "Accept, Sec-Fetch-Dest");
    setHeader(event, "x-robots-tag", "noindex");
    setResponseStatus(event, response.status);

    return markdown;
  }

  if (!isMarkdownEligibleHtmlPath(pathname)) {
    return;
  }

  if (!shouldServeMarkdown(getHeader(event, "accept"), getHeader(event, "sec-fetch-dest"))) {
    return;
  }

  setHeader(event, "cache-control", "private, no-store");
  setHeader(event, "vary", "Accept, Sec-Fetch-Dest");
  return sendRedirect(event, `${markdownPathFromHtmlPath(pathname)}${url.search}`, 307);
});
