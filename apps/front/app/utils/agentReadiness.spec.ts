import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildPagesUrlset, buildSitemapIndex, newsSitemapPath } from "./sitemap";

const frontRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const publicDir = join(frontRoot, "public");
const contentDir = join(frontRoot, "content");

function readPublic(relativePath: string): string {
  return readFileSync(join(publicDir, relativePath), "utf8");
}

function readContent(relativePath: string): string {
  return readFileSync(join(contentDir, relativePath), "utf8");
}

describe("llms.txt", () => {
  const llmsTxt = readPublic("llms.txt");

  it("includes when-to-use guidance before the first H2 file list", () => {
    const firstH2 = llmsTxt.indexOf("\n## ");
    expect(firstH2).toBeGreaterThan(0);
    const body = llmsTxt.slice(0, firstH2);
    expect(body).toMatch(/^# sarpbc\.org/m);
    expect(body).toContain("> Make Rocket League esports easier to understand");
    expect(body).toContain("When to use this");
    expect(body).toContain("How to call");
  });

  it("keeps H2 sections as markdown link lists", () => {
    const sections = llmsTxt.split("\n## ").slice(1);
    for (const section of sections) {
      const lines = section
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("- ["));
      expect(lines.length).toBeGreaterThan(0);
    }
  });

  it("links contact and agent instructions", () => {
    expect(llmsTxt).toContain("[Contact](https://sarpbc.org/contact");
    expect(llmsTxt).toContain("[Agent instructions](https://sarpbc.org/agent-instructions.md");
  });
});

describe("agent-instructions.md", () => {
  const instructions = readPublic("agent-instructions.md");

  it("includes an explicit when-to-use section", () => {
    expect(instructions).toMatch(/^# Agent instructions for sarpbc\.org/m);
    expect(instructions).toContain("## When to use this");
    expect(instructions).toContain("https://api.sarpbc.org/mcp");
    expect(instructions).toContain("contact@sarpbc.org");
  });
});

describe("contact content", () => {
  it("has at least 500 characters per locale", () => {
    for (const locale of ["en", "fr"] as const) {
      const markdown = readContent(`contact/${locale}.md`);
      expect(markdown.length).toBeGreaterThanOrEqual(500);
      expect(markdown).toContain("contact@sarpbc.org");
    }
  });
});

describe("robots.txt", () => {
  it("points crawlers at the sitemap index", () => {
    expect(readPublic("robots.txt")).toContain("Sitemap: https://sarpbc.org/sitemap_index.xml");
  });
});

describe("sitemap index", () => {
  it("lists the pages urlset and a news chunk", () => {
    const index = buildSitemapIndex(1);
    expect(index).toContain("<loc>https://sarpbc.org/sitemaps/pages.xml</loc>");
    expect(index).toContain(`<loc>https://sarpbc.org${newsSitemapPath(0)}</loc>`);
  });
});

describe("pages sitemap", () => {
  it("includes about and contact trust pages", () => {
    const sitemap = buildPagesUrlset();
    expect(sitemap).toContain("<loc>https://sarpbc.org/about</loc>");
    expect(sitemap).toContain("<loc>https://sarpbc.org/contact</loc>");
    expect(sitemap).toContain('href="https://sarpbc.org/fr/about"');
    expect(sitemap).toContain('href="https://sarpbc.org/fr/contact"');
  });
});
