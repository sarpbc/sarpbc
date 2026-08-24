import { excerptFromContent, stripMarkdownToPlain } from "./news-content.util";

describe("news-content.util", () => {
  it("strips markdown to plain text", () => {
    expect(stripMarkdownToPlain("## Hello **world**")).toBe("Hello world");
  });

  it("replaces player and team MDC tags with labels", () => {
    expect(
      stripMarkdownToPlain(
        ':team{slug="team-falcons-rl" label="Team Falcons"} beat :player{slug="jstn" label="jstn"} **4-3**.',
      ),
    ).toBe("Team Falcons beat jstn 4-3.");
  });

  it("keeps hyphenated scores", () => {
    expect(stripMarkdownToPlain("a 4-0 sweep")).toBe("a 4-0 sweep");
  });

  it("turns links into their visible text", () => {
    expect(stripMarkdownToPlain("See [sarpbc.org](https://sarpbc.org).")).toBe("See sarpbc.org.");
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
