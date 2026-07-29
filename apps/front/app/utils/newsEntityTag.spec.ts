import { describe, expect, it } from "vitest";
import { parseNewsEntityTag, serializeNewsEntityTag } from "@sarpbc/utils";

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
