import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors";
import {
  assertValidMatchBlocks,
  excerptFromContent,
  stripMarkdownToPlain,
} from "./news-content.util";

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

  it("drops tweet tags from excerpts", () => {
    expect(
      stripMarkdownToPlain(
        'Comm retired.\n\n:tweet{url="https://x.com/RL_Comm/status/2095971934320071030"}\n\nHe will attend Worlds.',
      ),
    ).toBe("Comm retired. He will attend Worlds.");
  });

  it("drops match blocks from excerpts", () => {
    expect(
      stripMarkdownToPlain(
        'Falcons won.\n\n:matches{match="0b8e7c62-4d0f-4c47-9a57-0e6a5c3d9f11"}\n\nNext up: Worlds.',
      ),
    ).toBe("Falcons won. Next up: Worlds.");
  });

  it("accepts well-formed match blocks", () => {
    expect(() =>
      assertValidMatchBlocks(
        [
          ':matches{match="0b8e7c62-4d0f-4c47-9a57-0e6a5c3d9f11"}',
          ':matches{ids="0b8e7c62-4d0f-4c47-9a57-0e6a5c3d9f11,6f1d2b0a-93c4-4e8f-b7a2-5c1e8d4f0a22"}',
          '::matches{team="c9e1a3b5-7d9f-4b1d-a3c5-e7f9b1d3f544" limit="10"}\n::',
        ].join("\n\n"),
      ),
    ).not.toThrow();
  });

  it("rejects malformed match blocks with the offending tag", () => {
    expect(() => assertValidMatchBlocks(':matches{tournament="rlcs-worlds"}')).toThrow(
      InvalidInputError,
    );
    expect(() => assertValidMatchBlocks(':matches{tournament="rlcs-worlds"}')).toThrow(
      ':matches{tournament="rlcs-worlds"}',
    );
  });

  it("rejects a match block inside a sentence", () => {
    expect(() =>
      assertValidMatchBlocks('Watch :matches{match="0b8e7c62-4d0f-4c47-9a57-0e6a5c3d9f11"} live.'),
    ).toThrow("on its own line");
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
