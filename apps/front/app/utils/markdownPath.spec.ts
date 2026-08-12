import { describe, expect, it } from "vitest";
import {
  htmlPathFromMarkdownPath,
  isInternalOrAssetPath,
  isMarkdownEligibleHtmlPath,
  isMarkdownPagePath,
  markdownPathFromHtmlPath,
} from "./markdownPath";

describe("markdownPath", () => {
  it("maps html paths to markdown twins", () => {
    expect(markdownPathFromHtmlPath("/")).toBe("/index.md");
    expect(markdownPathFromHtmlPath("/fr")).toBe("/fr/index.md");
    expect(markdownPathFromHtmlPath("/fr/")).toBe("/fr/index.md");
    expect(markdownPathFromHtmlPath("/about")).toBe("/about.md");
    expect(markdownPathFromHtmlPath("/news/foo")).toBe("/news/foo.md");
    expect(markdownPathFromHtmlPath("/fr/matches")).toBe("/fr/matches.md");
  });

  it("maps markdown twins back to html paths", () => {
    expect(htmlPathFromMarkdownPath("/index.md")).toBe("/");
    expect(htmlPathFromMarkdownPath("/fr/index.md")).toBe("/fr");
    expect(htmlPathFromMarkdownPath("/about.md")).toBe("/about");
    expect(htmlPathFromMarkdownPath("/news/foo.md")).toBe("/news/foo");
  });

  it("recognizes page markdown paths and skips assets", () => {
    expect(isMarkdownPagePath("/about.md")).toBe(true);
    expect(isMarkdownPagePath("/index.md")).toBe(true);
    expect(isMarkdownPagePath("/llms.txt")).toBe(false);
    expect(isMarkdownPagePath("/favicon.ico")).toBe(false);
    expect(isMarkdownPagePath("/_nuxt/foo.md")).toBe(false);
    expect(isInternalOrAssetPath("/og/match/abc")).toBe(true);
    expect(isInternalOrAssetPath("/matches")).toBe(false);
  });

  it("skips private and asset html paths for markdown", () => {
    expect(isMarkdownEligibleHtmlPath("/matches")).toBe(true);
    expect(isMarkdownEligibleHtmlPath("/")).toBe(true);
    expect(isMarkdownEligibleHtmlPath("/profile")).toBe(false);
    expect(isMarkdownEligibleHtmlPath("/fr/login")).toBe(false);
    expect(isMarkdownEligibleHtmlPath("/dashboard/news")).toBe(false);
    expect(isMarkdownEligibleHtmlPath("/about.md")).toBe(false);
    expect(isMarkdownEligibleHtmlPath("/favicon.ico")).toBe(false);
  });
});
