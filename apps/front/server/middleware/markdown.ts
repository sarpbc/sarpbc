import type { H3Event } from "h3";
import { htmlToMarkdown } from "@mdream/js";
import { shouldServeMarkdown } from "@mdream/js/negotiate";
import { filterPlugin, frontmatterPlugin } from "@mdream/js/plugins";
import {
  htmlPathFromMarkdownPath,
  isMarkdownEligibleHtmlPath,
  isMarkdownPagePath,
  markdownPathFromHtmlPath,
} from "~/utils/markdownPath";

const INTERNAL_HEADER = "x-sarpbc-markdown-internal";
const LLMS_TXT_LINK = '<https://sarpbc.org/llms.txt>; rel="describedby"';

async function sendMarkdown(event: H3Event, htmlPath: string, search: string) {
  const response = await useNitroApp().localFetch(`${htmlPath}${search}`, {
    method: "GET",
    headers: {
      [INTERNAL_HEADER]: "1",
      accept: "text/html",
      "sec-fetch-dest": "document",
      cookie: getHeader(event, "cookie") ?? "",
      "accept-language": getHeader(event, "accept-language") ?? "",
    },
  });

  setHeader(event, "vary", "Accept, Sec-Fetch-Dest");

  const location = response.headers.get("location");
  if (response.status >= 300 && response.status < 400 && location) {
    const target = new URL(location, getRequestURL(event).origin);
    return sendRedirect(
      event,
      `${markdownPathFromHtmlPath(target.pathname)}${target.search}`,
      response.status,
    );
  }

  setHeader(event, "content-type", "text/markdown; charset=utf-8");
  setHeader(event, "x-robots-tag", "noindex");

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    setResponseStatus(event, response.status || 404);
    return "Page not found.\n";
  }

  const html = await response.text();
  setResponseStatus(event, response.status);
  return htmlToMarkdown(html, {
    origin: getRequestURL(event).origin,
    plugins: [
      frontmatterPlugin(),
      filterPlugin({
        exclude: ["header", "footer", "form", "script", "style", "noscript"],
      }),
    ],
  });
}

export default defineEventHandler(async (event) => {
  if (event.method !== "GET" && event.method !== "HEAD") {
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
    return sendMarkdown(event, htmlPath, url.search);
  }

  if (!isMarkdownEligibleHtmlPath(pathname)) {
    return;
  }

  if (shouldServeMarkdown(getHeader(event, "accept"), getHeader(event, "sec-fetch-dest"))) {
    setHeader(event, "cache-control", "private, no-store");
    return sendMarkdown(event, pathname, url.search);
  }

  setHeader(event, "vary", "Accept, Sec-Fetch-Dest");
  setHeader(event, "link", LLMS_TXT_LINK);
});
