import { describe, expect, it } from "vitest";
import { buildWebSite } from "./webSite";
import { ORGANIZATION_ID } from "./organization";
import { SCHEMA_ORG } from "./jsonLd";

describe("buildWebSite", () => {
  it("links publisher to the organization entity", () => {
    const site = buildWebSite({
      description:
        "Live RLCS schedules, match results, news, pick'ems, and Air Riddle — bilingual Rocket League esports hub.",
    });

    expect(site["@context"]).toBe(SCHEMA_ORG);
    expect(site["@type"]).toBe("WebSite");
    expect(site.name).toBe("sarpbc.org");
    expect(site.url).toBe("https://sarpbc.org");
    expect(site.inLanguage).toEqual(["en", "fr"]);
    expect(site.publisher).toEqual({ "@id": ORGANIZATION_ID });
  });
});
