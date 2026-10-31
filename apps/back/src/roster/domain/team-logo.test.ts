import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors";
import {
  detectTeamLogoFormat,
  isLiquipediaHost,
  requireSafeSvg,
  requireTeamLogoDimensions,
  requireTeamLogoUrl,
  teamLogoField,
  teamLogoKey,
} from "./team-logo";

const text = (value: string) => new TextEncoder().encode(value);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const WEBP = text("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ");

describe("team logo rules", () => {
  it("detects PNG, WebP and SVG from their content", () => {
    expect(detectTeamLogoFormat(PNG)).toBe("png");
    expect(detectTeamLogoFormat(WEBP)).toBe("webp");
    expect(detectTeamLogoFormat(text('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBe("svg");
    expect(
      detectTeamLogoFormat(text('﻿<?xml version="1.0"?>\n<!-- logo -->\n<svg viewBox="0 0 1 1">')),
    ).toBe("svg");
  });

  it("detects SVG in linear time behind ambiguous comments", () => {
    const comments = "<!--" + "--><!--".repeat(40);
    const started = performance.now();

    expect(() => detectTeamLogoFormat(text(comments))).toThrow(InvalidInputError);
    expect(detectTeamLogoFormat(text(`${comments}--><svg>`))).toBe("svg");
    expect(performance.now() - started).toBeLessThan(100);
  });

  it("rejects an SVG hidden behind an unterminated prologue", () => {
    expect(() => detectTeamLogoFormat(text("<!-- <svg>"))).toThrow(InvalidInputError);
    expect(() => detectTeamLogoFormat(text('<?xml version="1.0" <svg>'))).toThrow(
      InvalidInputError,
    );
  });

  it("rejects other formats whatever the URL claims", () => {
    expect(() => detectTeamLogoFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toThrow(
      "The logo must be a PNG, WebP or SVG image.",
    );
    expect(() => detectTeamLogoFormat(text("GIF89a"))).toThrow(InvalidInputError);
    expect(() => detectTeamLogoFormat(text("<html><svg></svg></html>"))).toThrow(InvalidInputError);
  });

  it("accepts a self-contained SVG with internal references", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><linearGradient id="g"/></defs><rect fill="url(#g)"/><use xlink:href="#g"/><use href=\'#g\'/></svg>';
    expect(() => requireSafeSvg(text(svg))).not.toThrow();
  });

  it("accepts an embedded raster image", () => {
    const svg = '<svg><image href="data:image/png;base64,iVBORw0KGgo="/></svg>';
    expect(() => requireSafeSvg(text(svg))).not.toThrow();
  });

  it.each([
    ["<svg><script>alert(1)</script></svg>", "a script element"],
    ['<svg onload="alert(1)"/>', "an event handler attribute"],
    ["<svg><foreignObject><div/></foreignObject></svg>", "a foreignObject element"],
    ['<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg>&x;</svg>', "a DOCTYPE"],
    ['<svg><image href="https://evil.test/a.png"/></svg>', "an external reference"],
    ['<svg><use xlink:href="file:///etc/passwd#a"/></svg>', "an external reference"],
    ['<svg><image href="data:image/svg+xml;base64,PHN2Zz4="/></svg>', "an external reference"],
    ['<svg><rect style="fill:url(https://evil.test/x)"/></svg>', "an external url() reference"],
    ['<svg><a href="javascript:alert(1)"/></svg>', "a javascript: URL"],
    ["<svg><style>@import 'https://evil.test/a.css';</style></svg>", "a stylesheet import"],
    ['<svg><iframe src="https://evil.test"/></svg>', "an embedded element"],
  ])("rejects an unsafe SVG: %s", (svg, reason) => {
    expect(() => requireSafeSvg(text(svg))).toThrow(reason);
  });

  it("requires at least 128 pixels on each side", () => {
    expect(() => requireTeamLogoDimensions(128, 400)).not.toThrow();
    expect(() => requireTeamLogoDimensions(400, 127)).toThrow(
      "The logo is 400x127 pixels; it must be at least 128x128.",
    );
  });

  it("only downloads https assets outside Liquipedia", () => {
    expect(requireTeamLogoUrl("https://kcorp.gg/logo.png").hostname).toBe("kcorp.gg");
    expect(() => requireTeamLogoUrl("http://kcorp.gg/logo.png")).toThrow("must use https");
    expect(() => requireTeamLogoUrl("not a url")).toThrow("not a valid URL");
    expect(() => requireTeamLogoUrl("https://liquipedia.net/commons/images/kc.png")).toThrow(
      "Liquipedia",
    );
    expect(isLiquipediaHost("LIQUIPEDIA.NET.")).toBe(true);
    expect(isLiquipediaHost("notliquipedia.net")).toBe(false);
  });

  it("stores each variant under a content-addressed key", () => {
    expect(teamLogoKey("kc", "dark", "0123abcd")).toBe("teams/kc/logo-dark-0123abcd.webp");
    expect(teamLogoField("light")).toBe("logoLightUrl");
    expect(teamLogoField("dark")).toBe("logoDarkUrl");
  });
});
