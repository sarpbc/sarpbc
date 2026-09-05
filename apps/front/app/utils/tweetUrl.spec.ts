import { describe, expect, it } from "vitest";
import { parseNewsTweetTag, parseTweetUrl, serializeNewsTweetTag } from "@sarpbc/utils";

describe("parseTweetUrl", () => {
  it("parses x.com status URLs", () => {
    expect(parseTweetUrl("https://x.com/RL_Comm/status/2095971934320071030?s=20")).toEqual({
      id: "2095971934320071030",
      handle: "RL_Comm",
      url: "https://x.com/RL_Comm/status/2095971934320071030",
      oembedUrl: "https://twitter.com/RL_Comm/status/2095971934320071030",
    });
  });

  it("parses twitter.com and i/web status URLs", () => {
    expect(parseTweetUrl("https://twitter.com/Interior/status/463440424141459456")?.id).toBe(
      "463440424141459456",
    );
    expect(parseTweetUrl("https://x.com/i/web/status/463440424141459456")).toEqual({
      id: "463440424141459456",
      handle: null,
      url: "https://x.com/i/web/status/463440424141459456",
      oembedUrl: "https://twitter.com/i/web/status/463440424141459456",
    });
  });

  it("rejects non-status URLs", () => {
    expect(parseTweetUrl("https://x.com/RL_Comm")).toBeNull();
    expect(parseTweetUrl("https://example.com/status/1")).toBeNull();
  });
});

describe("news tweet tag", () => {
  it("round-trips an inline tweet tag", () => {
    const serialized = serializeNewsTweetTag("https://x.com/RL_Comm/status/2095971934320071030");
    expect(serialized).toBe(':tweet{url="https://x.com/RL_Comm/status/2095971934320071030"}');

    const parsed = parseNewsTweetTag(serialized);
    expect(parsed?.parsed.id).toBe("2095971934320071030");
    expect(parsed?.url).toBe("https://x.com/RL_Comm/status/2095971934320071030");
  });

  it("parses MDC block tweet tags", () => {
    const parsed = parseNewsTweetTag(
      '::tweet{url="https://twitter.com/Interior/status/463440424141459456"}\n::',
    );
    expect(parsed?.parsed.id).toBe("463440424141459456");
  });
});
