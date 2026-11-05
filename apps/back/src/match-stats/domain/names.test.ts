import { describe, expect, it } from "vitest";
import { normalizeName, playerNameMatches, teamNameMatches } from "./names";

describe("normalizeName", () => {
  it("drops case, accents, spaces and punctuation", () => {
    expect(normalizeName("  Atow. ")).toBe("atow");
    expect(normalizeName("Équipe Évoluée")).toBe("equipeevoluee");
    expect(normalizeName("M0nkey M00n")).toBe("m0nkeym00n");
  });
});

describe("playerNameMatches", () => {
  it.each([
    ["Vatira", "vatira"],
    ["Vatira.", "Vatira"],
    ["KC Vatira", "Vatira"],
    ["BDS.M0nkey M00n", "M0nkey M00n"],
    ["zen_rl", "zen"],
    ["Zéphyr", "zephyr"],
    ["Rise", "Rise."],
  ])("matches %s with %s", (inGame, player) => {
    expect(playerNameMatches(inGame, player)).toBe(true);
  });

  it.each([
    ["Vatira", "Atow"],
    ["Mawkzy", "aw"],
    ["", "Vatira"],
  ])("rejects %s with %s", (inGame, player) => {
    expect(playerNameMatches(inGame, player)).toBe(false);
  });

  it("does not treat a short name as a tag", () => {
    expect(playerNameMatches("Kaydop", "op")).toBe(false);
  });
});

describe("teamNameMatches", () => {
  it.each([
    ["KARMINE CORP", "Karmine Corp"],
    ["KC", "Karmine Corp"],
    ["Team BDS", "BDS"],
    ["Vitality", "Team Vitality"],
    ["GENTLE MATES ALPINE", "Gentle Mates"],
    ["Falcons Esports", "Team Falcons"],
  ])("matches %s with %s", (replay, team) => {
    expect(teamNameMatches(replay, team)).toBe(true);
  });

  it.each([
    ["BLUE", "Karmine Corp"],
    ["ORANGE", "Team BDS"],
    ["G2", "Gen.G"],
    ["Team", "Team BDS"],
  ])("rejects %s with %s", (replay, team) => {
    expect(teamNameMatches(replay, team)).toBe(false);
  });
});
