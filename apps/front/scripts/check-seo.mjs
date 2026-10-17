import assert from "node:assert/strict";
import { parse } from "parse5";
import { INDEXNOW_KEY_PATTERN } from "@sarpbc/utils";

const base = process.argv[2] ?? "http://localhost:4000";
const site = "https://sarpbc.org";

async function get(path, label = path) {
  const response = await fetch(new URL(path, base), {
    headers: { Accept: "text/html", "Accept-Language": "en-US" },
    redirect: "manual",
    signal: AbortSignal.timeout(60000),
  });
  assert.equal(response.status, 200, `${label}: HTTP ${response.status}`);
  return { response, text: await response.text() };
}

function elements(node, found = []) {
  if (node.tagName) found.push(node);
  for (const child of node.childNodes ?? []) elements(child, found);
  return found;
}

function attr(node, name) {
  return node.attrs.find((attribute) => attribute.name === name)?.value;
}

function locations(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
}

const configuredKey = process.env.INDEXNOW_KEY;
assert.ok(
  configuredKey && INDEXNOW_KEY_PATTERN.test(configuredKey),
  "Set INDEXNOW_KEY in the local environment before verification",
);
const { response: keyResponse, text: key } = await get(
  `/${configuredKey}.txt`,
  "IndexNow key file",
);
assert.ok(key === configuredKey, "The verification key must match backend submissions");
assert.ok(keyResponse.headers.get("content-type")?.startsWith("text/plain"));

const { text: sitemap } = await get("/sitemaps/pages.xml");
const paths = locations(sitemap);
assert.ok(paths.includes("/fr/"), "Sitemap must list the French homepage");
assert.ok(paths.includes("/matches"), "Sitemap must list matches");
assert.ok(paths.includes("/results"), "Sitemap must list results");
assert.ok(
  !paths.some((path) => /\/(login|register)$/.test(path)),
  "Account pages must stay out of the sitemap",
);
paths.push("/login", "/fr/login", "/register", "/fr/register");

const { text: newsSitemap } = await get("/news/0/news-sitemap.xml");
paths.push(...locations(newsSitemap).slice(-4));

let failures = 0;
for (const path of paths) {
  try {
    const { text: html } = await get(path);
    const nodes = elements(parse(html));
    const links = nodes.filter((node) => node.tagName === "link");
    const metas = nodes.filter((node) => node.tagName === "meta");
    const canonical = links.filter((node) => attr(node, "rel") === "canonical");
    assert.equal(canonical.length, 1, "Expected one canonical");
    assert.equal(
      attr(canonical[0], "href"),
      `${site}${path}`,
      "Canonical must retain the page locale",
    );
    const ogUrl = metas.find((node) => attr(node, "property") === "og:url");
    assert.equal(
      ogUrl && attr(ogUrl, "content"),
      `${site}${path}`,
      "Open Graph URL must match canonical",
    );
    assert.ok(
      nodes.some((node) => node.tagName === "h1"),
      "Missing H1",
    );
    assert.ok(
      nodes.some(
        (node) => node.tagName === "title" && node.childNodes.some((child) => child.value?.trim()),
      ),
      "Missing title",
    );
    if (path === "/" || path === "/fr/" || path.includes("/news/")) {
      const title = nodes.find((node) => node.tagName === "title");
      assert.ok(
        title.childNodes.some((child) => child.value?.includes("sarpbc.org")),
        "Site name missing from title",
      );
    }
    const description = metas.find((node) => attr(node, "name") === "description");
    assert.ok(description && attr(description, "content")?.trim(), "Missing description");
    for (const image of nodes.filter((node) => node.tagName === "img")) {
      assert.notEqual(attr(image, "alt"), undefined, `Missing ALT: ${attr(image, "src")}`);
    }
    if (/\/(login|register)$/.test(path)) {
      const robots = metas.find((node) => attr(node, "name") === "robots");
      assert.ok(
        robots && attr(robots, "content")?.includes("noindex"),
        "Account page must be noindex",
      );
    } else {
      const englishPath = path.replace(/^\/fr(?=\/|$)/, "") || "/";
      const frenchPath = englishPath === "/" ? "/fr/" : `/fr${englishPath}`;
      for (const [language, href] of [
        ["en", englishPath],
        ["fr", frenchPath],
        ["x-default", englishPath],
      ]) {
        assert.ok(
          links.some(
            (node) =>
              attr(node, "hreflang") === language && attr(node, "href") === `${site}${href}`,
          ),
          `Incorrect ${language} alternate`,
        );
      }
    }
    console.log(`PASS ${path}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${path}: ${error.message}`);
  }
}
console.log(
  `${paths.length - failures}/${paths.length} pages passed. IndexNow key and sitemap checked.`,
);
process.exitCode = failures === 0 ? 0 : 1;
