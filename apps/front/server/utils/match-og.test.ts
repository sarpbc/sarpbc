import { Resvg } from "@resvg/resvg-js";
import { describe, expect, it } from "vitest";
import type { MatchDetailResponse } from "~/types/matches";
import { buildMatchOgSvg, getMatchOgResvgFontOptions, resolveMatchOgFontFiles } from "./match-og";

const stamp = new Date("2026-08-14T18:00:00.000Z");

function matchDetail(overrides: {
  teamA?: string;
  teamB?: string;
  status?: string;
  endAt?: Date | null;
  beginAt?: Date | null;
  scoreA?: number;
  scoreB?: number;
}): MatchDetailResponse {
  return {
    match: {
      id: "m1",
      name: "Vitality vs BDS",
      createdAt: stamp,
      updatedAt: stamp,
      status: overrides.status,
      beginAt: overrides.beginAt === undefined ? stamp : overrides.beginAt,
      endAt: overrides.endAt ?? undefined,
      participants: [
        { id: "p1", team: { name: overrides.teamA ?? "Vitality" } },
        { id: "p2", team: { name: overrides.teamB ?? "BDS" } },
      ],
      results: [
        { participant: "p1", score: overrides.scoreA ?? 4 },
        { participant: "p2", score: overrides.scoreB ?? 3 },
      ],
      tournament: { id: "t1", name: "Major", league: { id: "l1", name: "RLCS" } },
    },
    teamForms: {},
    headToHead: null,
  } as MatchDetailResponse;
}

function renderPng(
  svg: string,
  font: { loadSystemFonts: boolean; fontFiles?: string[]; defaultFontFamily?: string },
): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
    font,
  });
  return Buffer.from(resvg.render().asPng());
}

describe("buildMatchOgSvg", () => {
  it("renders a finished scoreline", () => {
    const svg = buildMatchOgSvg(
      matchDetail({ status: "finished", endAt: stamp, scoreA: 4, scoreB: 1 }),
    );

    expect(svg).toContain("Vitality");
    expect(svg).toContain("BDS");
    expect(svg).toContain("4 - 1");
    expect(svg).toContain("Final score");
    expect(svg).toContain("RLCS Major");
    expect(svg).toContain('font-family="Inter"');
  });

  it("renders vs for upcoming matches", () => {
    const svg = buildMatchOgSvg(
      matchDetail({
        status: "not_started",
        beginAt: new Date("2099-01-01T00:00:00.000Z"),
        endAt: null,
      }),
    );

    expect(svg).toContain(">vs<");
    expect(svg).not.toContain("Final score");
  });

  it("escapes team names for XML", () => {
    const svg = buildMatchOgSvg(matchDetail({ teamA: `A&B <Team>` }));
    expect(svg).toContain("A&amp;B &lt;Team&gt;");
    expect(svg).not.toContain("A&B <Team>");
  });
});

describe("match OG fonts", () => {
  it("resolves bundled Inter files", () => {
    const files = resolveMatchOgFontFiles();
    expect(files).toHaveLength(2);
    expect(files[0]?.endsWith("Inter-Regular.ttf")).toBe(true);
    expect(files[1]?.endsWith("Inter-Bold.ttf")).toBe(true);
  });

  it("rasterizes distinct text when bundled fonts are loaded", () => {
    const vitality = buildMatchOgSvg(matchDetail({ status: "finished", endAt: stamp }));
    const kcorp = buildMatchOgSvg(
      matchDetail({ status: "finished", endAt: stamp, teamA: "Karmine Corp" }),
    );
    const fonts = getMatchOgResvgFontOptions();

    const withFontsA = renderPng(vitality, fonts);
    const withFontsB = renderPng(kcorp, fonts);
    const withoutFontsA = renderPng(vitality, { loadSystemFonts: false });
    const withoutFontsB = renderPng(kcorp, { loadSystemFonts: false });

    expect(withoutFontsA.equals(withoutFontsB)).toBe(true);
    expect(withFontsA.equals(withFontsB)).toBe(false);
    expect(withFontsA.equals(withoutFontsA)).toBe(false);
  });
});
