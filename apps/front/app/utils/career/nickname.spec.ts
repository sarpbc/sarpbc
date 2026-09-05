import { describe, expect, it } from "vitest";
import type { CareerPlacement } from "~/types/career";
import { pickCareerNickname, type CareerNicknameInput } from "~/utils/career/nickname";

function input(overrides: {
  role?: CareerNicknameInput["role"];
  destiny?: CareerNicknameInput["destiny"];
  trophyTypes?: CareerNicknameInput["trophies"][number]["type"][];
  worlds?: (CareerPlacement | null)[];
}): CareerNicknameInput {
  return {
    role: overrides.role ?? "offense",
    destiny: overrides.destiny ?? "quit",
    trophies: (overrides.trophyTypes ?? []).map((type, index) => ({
      type,
      season: index + 1,
    })),
    seasons: (overrides.worlds ?? [null]).map((worlds) => ({ worlds })),
  };
}

describe("pickCareerNickname", () => {
  it("gives GOAT-tier for multiple Worlds titles", () => {
    expect(
      pickCareerNickname(
        input({
          role: "defense",
          trophyTypes: ["worlds", "worlds", "major"],
          worlds: ["winner", "winner", "finalist"],
        }),
      ),
    ).toBe("goat");
  });

  it("flavors a single Worlds title by role", () => {
    const worlds = ["winner", "top8", "top4"] as const;
    expect(
      pickCareerNickname(input({ role: "offense", trophyTypes: ["worlds"], worlds: [...worlds] })),
    ).toBe("closer");
    expect(
      pickCareerNickname(input({ role: "defense", trophyTypes: ["worlds"], worlds: [...worlds] })),
    ).toBe("iceBlood");
    expect(
      pickCareerNickname(
        input({ role: "technical", trophyTypes: ["worlds"], worlds: [...worlds] }),
      ),
    ).toBe("airSurgeon");
  });

  it("names a major machine that never won Worlds", () => {
    expect(
      pickCareerNickname(
        input({
          trophyTypes: ["major", "major", "regional"],
          worlds: ["top8", "group", null, "top4"],
        }),
      ),
    ).toBe("majorHunter");
  });

  it("names a long peak that never won Worlds", () => {
    const podiumRun: (CareerPlacement | null)[] = ["top4", "finalist", "top4", "top8", null];
    expect(pickCareerNickname(input({ role: "offense", worlds: podiumRun }))).toBe("surfaceFox");
    expect(pickCareerNickname(input({ role: "defense", worlds: podiumRun }))).toBe("theWall");
    expect(pickCareerNickname(input({ role: "technical", worlds: podiumRun }))).toBe("resetGhost");
  });

  it("uses an ironic nickname for a short bust", () => {
    expect(pickCareerNickname(input({ worlds: [null] }))).toBe("lanTourist");
    expect(
      pickCareerNickname(
        input({
          destiny: "streamer",
          trophyTypes: ["regional"],
          worlds: [null, "group"],
        }),
      ),
    ).toBe("lanTourist");
  });

  it("flavors a long career without a peak by destiny", () => {
    const longRun: (CareerPlacement | null)[] = [null, "group", "top8", null, "group", "top8"];
    expect(pickCareerNickname(input({ destiny: "streamer", worlds: longRun }))).toBe("theMic");
    expect(pickCareerNickname(input({ destiny: "coach", worlds: longRun }))).toBe("sideline");
    expect(pickCareerNickname(input({ destiny: "quit", worlds: longRun }))).toBe("walkedOff");
  });
});
