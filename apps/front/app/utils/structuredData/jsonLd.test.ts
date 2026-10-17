import { describe, expect, it } from "vitest";
import { compactJsonLd, serializeJsonLd } from "./jsonLd";

describe("compactJsonLd", () => {
  it("drops undefined fields and keeps defined values", () => {
    expect(
      compactJsonLd({
        "@type": "Thing",
        name: "RLCS",
        url: undefined,
      }),
    ).toEqual({
      "@type": "Thing",
      name: "RLCS",
    });
  });
});

describe("serializeJsonLd", () => {
  it("escapes angle brackets so JSON-LD is safe inside a script tag", () => {
    expect(serializeJsonLd({ "@type": "Thing", name: "A </script> B" })).toBe(
      '{"@type":"Thing","name":"A \\u003c/script> B"}',
    );
  });
});
