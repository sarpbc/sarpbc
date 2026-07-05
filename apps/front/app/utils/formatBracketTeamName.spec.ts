import { describe, expect, it } from "vitest";
import { formatBracketTeamName } from "./formatBracketTeamName";

describe("formatBracketTeamName", () => {
  it("removes Esports and Gaming suffixes", () => {
    expect(formatBracketTeamName("NRG Esports")).toBe("NRG");
    expect(formatBracketTeamName("Spacestation Gaming")).toBe("Spacestation");
    expect(formatBracketTeamName("Manchester City Esports")).toBe("Manchester City");
    expect(formatBracketTeamName("FURIA Esports")).toBe("FURIA");
  });

  it("leaves other names unchanged", () => {
    expect(formatBracketTeamName("Karmine Corp")).toBe("Karmine Corp");
    expect(formatBracketTeamName("Shopify Rebellion")).toBe("Shopify Rebellion");
  });
});
