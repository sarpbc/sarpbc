import { describe, expect, it } from "vitest";
import {
  buildMatchDetailTo,
  isMatchDiscoverySource,
  listVariantToDiscoveryStatus,
  parseMatchDiscoverySource,
  resolveMatchDiscoveryStatus,
} from "./matchDiscoveryAnalytics";

describe("matchDiscoveryAnalytics", () => {
  describe("isMatchDiscoverySource / parseMatchDiscoverySource", () => {
    it("accepts known sources", () => {
      expect(isMatchDiscoverySource("matches_list")).toBe(true);
      expect(parseMatchDiscoverySource("lateral_bar")).toBe("lateral_bar");
    });

    it("rejects unknown values", () => {
      expect(isMatchDiscoverySource("player_profile")).toBe(false);
      expect(parseMatchDiscoverySource("direct")).toBeNull();
      expect(parseMatchDiscoverySource(undefined)).toBeNull();
    });

    it("parses the first query array entry", () => {
      expect(parseMatchDiscoverySource(["home_strip", "matches_list"])).toBe("home_strip");
    });
  });

  describe("listVariantToDiscoveryStatus", () => {
    it("maps list variants", () => {
      expect(listVariantToDiscoveryStatus("live")).toBe("live");
      expect(listVariantToDiscoveryStatus("upcoming")).toBe("upcoming");
      expect(listVariantToDiscoveryStatus("result")).toBe("finished");
    });
  });

  describe("resolveMatchDiscoveryStatus", () => {
    const now = Date.parse("2026-08-07T12:00:00.000Z");

    it("returns finished when ended", () => {
      expect(
        resolveMatchDiscoveryStatus({
          endAt: "2026-08-07T11:00:00.000Z",
          beginAt: "2026-08-07T10:00:00.000Z",
          now,
        }),
      ).toBe("finished");
    });

    it("returns finished when status is finished", () => {
      expect(resolveMatchDiscoveryStatus({ status: "finished", now })).toBe("finished");
    });

    it("returns live when begun and not ended", () => {
      expect(
        resolveMatchDiscoveryStatus({
          beginAt: "2026-08-07T11:30:00.000Z",
          now,
        }),
      ).toBe("live");
    });

    it("returns upcoming when not yet begun", () => {
      expect(
        resolveMatchDiscoveryStatus({
          beginAt: "2026-08-07T13:00:00.000Z",
          now,
        }),
      ).toBe("upcoming");
    });
  });

  describe("buildMatchDetailTo", () => {
    it("builds a localized path with from query", () => {
      expect(buildMatchDetailTo((path) => `/fr${path}`, "abc", "tournament_hub")).toEqual({
        path: "/fr/matches/abc",
        query: { from: "tournament_hub" },
      });
    });
  });
});
