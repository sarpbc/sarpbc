import { describe, expect, it } from "vitest";
import { buildNewsArticleJsonLd, newsArticleCanonicalUrl } from "./newsArticle";
import { ORGANIZATION_ID } from "./organization";
import { SCHEMA_ORG } from "./jsonLd";

describe("buildNewsArticleJsonLd", () => {
  it("builds a NewsArticle node with publisher and author", () => {
    const ld = buildNewsArticleJsonLd({
      title: "Comm retires from professional Rocket League",
      slug: "comm-retires",
      createdAt: "2026-09-05T09:07:26.831Z",
      content: "Comm has retired from professional Rocket League.",
      author: "Geoffroy",
      imageUrl: null,
    });

    expect(ld["@context"]).toBe(SCHEMA_ORG);
    expect(ld["@type"]).toBe("NewsArticle");
    expect(ld.headline).toBe("Comm retires from professional Rocket League");
    expect(ld.datePublished).toBe("2026-09-05T09:07:26.831Z");
    expect(ld.url).toBe(newsArticleCanonicalUrl("comm-retires"));
    expect(ld.author).toEqual({ "@type": "Person", name: "Geoffroy" });
    expect(ld.publisher).toEqual({ "@id": ORGANIZATION_ID });
    expect("image" in ld).toBe(false);
  });

  it("includes image when a cover URL is present", () => {
    const ld = buildNewsArticleJsonLd({
      title: "Worlds bundle",
      slug: "worlds-2026-community-bundle",
      createdAt: "2026-08-29T16:44:35.071Z",
      content: "Rocket League Esports is bringing back the community revenue-share bundle.",
      imageUrl: "https://cdn.example/cover.webp",
    });

    expect(ld.image).toBe("https://cdn.example/cover.webp");
    expect("author" in ld).toBe(false);
  });
});
