import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { excerptFromNewsContent, newsContentToPlainText } from "./news-content.ts";

describe("news content", () => {
  it("strips markdown to plain text", () => {
    assert.equal(newsContentToPlainText("## Hello **world**"), "Hello world");
  });

  it("replaces player and team MDC tags with labels", () => {
    assert.equal(
      newsContentToPlainText(
        ':team{slug="team-falcons-rl" label="Team Falcons"} beat :player{slug="jstn" label="jstn"} **4-3**.',
      ),
      "Team Falcons beat jstn 4-3.",
    );
  });

  it("drops tweet tags from excerpts", () => {
    assert.equal(
      newsContentToPlainText(
        'Comm retired.\n\n:tweet{url="https://x.com/RL_Comm/status/2095971934320071030"}\n\nHe will attend Worlds.',
      ),
      "Comm retired. He will attend Worlds.",
    );
  });

  it("drops match blocks from excerpts", () => {
    assert.equal(
      newsContentToPlainText(
        'Falcons won.\n\n:matches{match="0b8e7c62-4d0f-4c47-9a57-0e6a5c3d9f11"}\n\nNext up: Worlds.',
      ),
      "Falcons won. Next up: Worlds.",
    );
  });

  it("keeps hyphenated scores", () => {
    assert.equal(newsContentToPlainText("a 4-0 sweep"), "a 4-0 sweep");
  });

  it("turns links into their visible text", () => {
    assert.equal(
      newsContentToPlainText("See [sarpbc.org](https://sarpbc.org)."),
      "See sarpbc.org.",
    );
  });

  it("builds excerpt from content", () => {
    assert.equal(
      excerptFromNewsContent("# Title\n\nThis is a short excerpt candidate."),
      "Title This is a short excerpt candidate.",
    );
  });

  it("truncates long excerpts with ellipsis", () => {
    assert.equal(excerptFromNewsContent("a".repeat(150)), `${"a".repeat(120)}…`);
  });
});
