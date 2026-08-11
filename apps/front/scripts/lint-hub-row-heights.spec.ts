import { describe, expect, it } from "vitest";

const BANNED_PATTERNS = [
  /\bh-11\.25\b/,
  /\bh-11\.5\b/,
  /\bh-8\.25\b/,
  /\bleading-5\.5\b/,
  /\bpy-\[/,
];

function hasBannedHubRowUtility(line: string): boolean {
  return BANNED_PATTERNS.some((pattern) => pattern.test(line));
}

describe("lint-hub-row-heights banned patterns", () => {
  it("flags arbitrary hub row utilities", () => {
    expect(hasBannedHubRowUtility('class="h-11.25 flex"')).toBe(true);
    expect(hasBannedHubRowUtility('class="h-11.5"')).toBe(true);
    expect(hasBannedHubRowUtility('class="max-h-8.25"')).toBe(true);
    expect(hasBannedHubRowUtility('class="leading-5.5"')).toBe(true);
    expect(hasBannedHubRowUtility('class="py-[2.75px]!"')).toBe(true);
  });

  it("allows grid-module tokens", () => {
    expect(hasBannedHubRowUtility('class="h-row h-row-header"')).toBe(false);
    expect(hasBannedHubRowUtility('class="h-row-compact min-h-row"')).toBe(false);
  });
});
