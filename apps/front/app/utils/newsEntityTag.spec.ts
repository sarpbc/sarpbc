import { describe, expect, it } from "vitest";
import { newsContentToPlainText, parseNewsEntityTag, serializeNewsEntityTag } from "@sarpbc/utils";

describe("news entity tag", () => {
  it("round-trips a player tag", () => {
    const serialized = serializeNewsEntityTag({
      kind: "player",
      slug: "jstn",
      label: "jstn",
    });
    expect(serialized).toBe(':player{slug="jstn" label="jstn"}');

    const parsed = parseNewsEntityTag(serialized);
    expect(parsed).toEqual({
      kind: "player",
      slug: "jstn",
      label: "jstn",
      raw: serialized,
    });
  });

  it("round-trips labels with spaces and apostrophes", () => {
    const serialized = serializeNewsEntityTag({
      kind: "team",
      slug: "karmine-corp",
      label: "Karmine Corp",
    });
    const parsed = parseNewsEntityTag(serialized);
    expect(parsed?.label).toBe("Karmine Corp");
    expect(parsed?.slug).toBe("karmine-corp");
  });

  it("escapes double quotes in labels", () => {
    const serialized = serializeNewsEntityTag({
      kind: "player",
      slug: "test",
      label: 'Say "hello"',
    });
    expect(serialized).toBe(':player{slug="test" label="Say \\"hello\\""}');

    const parsed = parseNewsEntityTag(serialized);
    expect(parsed?.label).toBe('Say "hello"');
  });

  it("returns null for invalid syntax", () => {
    expect(parseNewsEntityTag(":player{slug=bad}")).toBeNull();
    expect(parseNewsEntityTag(':player{slug="x"}')).toBeNull();
  });
});

describe("newsContentToPlainText", () => {
  it("uses entity labels instead of MDC syntax", () => {
    expect(
      newsContentToPlainText(
        ':team{slug="team-falcons-rl" label="Team Falcons"} qualified for Worlds.',
      ),
    ).toBe("Team Falcons qualified for Worlds.");
  });

  it("drops tweet tags from excerpts", () => {
    expect(
      newsContentToPlainText(
        'Comm retired.\n\n:tweet{url="https://x.com/RL_Comm/status/2095971934320071030"}\n\nHe will attend Worlds.',
      ),
    ).toBe("Comm retired. He will attend Worlds.");
  });
});
