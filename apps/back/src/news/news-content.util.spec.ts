import { excerptFromContent, stripMarkdownToPlain } from "./news-content.util";

describe("news-content.util", () => {
  it("strips markdown to plain text", () => {
    expect(stripMarkdownToPlain("## Hello **world**")).toBe("Hello world");
  });

  it("builds excerpt from content", () => {
    const content = "# Title\n\nThis is a short excerpt candidate.";
    expect(excerptFromContent(content)).toBe("Title This is a short excerpt candidate.");
  });

  it("truncates long excerpts with ellipsis", () => {
    const long = "a".repeat(150);
    expect(excerptFromContent(long)).toBe(`${"a".repeat(120)}…`);
  });
});
