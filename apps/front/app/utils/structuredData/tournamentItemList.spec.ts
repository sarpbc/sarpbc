import { describe, expect, it } from "vitest";
import type { Tournament } from "~/types/tournament";
import { SCHEMA_ORG } from "./jsonLd";
import { buildTournamentItemList } from "./tournamentItemList";

function tournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: "t1",
    name: "Open 1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("buildTournamentItemList", () => {
  it("wraps the current page in ItemList and uses the API total", () => {
    const list = buildTournamentItemList({
      tournaments: [
        tournament({ id: "a", name: "Open 1", league: { name: "RLCS" } as Tournament["league"] }),
        tournament({ id: "b", name: "Open 2" }),
      ],
      total: 42,
      positionOffset: 20,
    });

    expect(list["@context"]).toBe(SCHEMA_ORG);
    expect(list["@type"]).toBe("ItemList");
    expect(list.url).toBe("https://sarpbc.org/tournaments");
    expect(list.numberOfItems).toBe(42);
    expect(list.itemListElement).toHaveLength(2);
    expect(list.itemListElement[0]?.position).toBe(21);
    expect(list.itemListElement[1]?.position).toBe(22);
    expect(list.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 21,
      name: "RLCS Open 1",
      url: "https://sarpbc.org/tournaments/a",
    });
    expect(list.itemListElement[1]?.url).toBe("https://sarpbc.org/tournaments/b");
    expect(JSON.stringify(list)).not.toContain("SportsEvent");
  });

  it("links to tournament detail pages using the league name and configured origin", () => {
    const list = buildTournamentItemList({
      tournaments: [
        tournament({
          name: "Group A",
          league: { name: "Esports World Cup" } as Tournament["league"],
        }),
      ],
      total: 1,
      origin: "https://example.com",
    });

    expect(list.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      name: "Esports World Cup Group A",
      url: "https://example.com/tournaments/t1",
    });
  });

  it("emits an empty item list without Offer schema", () => {
    const list = buildTournamentItemList({
      tournaments: [],
      total: 0,
    });
    const serialized = JSON.stringify(list);

    expect(list.itemListElement).toEqual([]);
    expect(serialized).not.toContain("Offer");
    expect(serialized).not.toContain("priceCurrency");
  });

  it("links to detail pages on the configured origin without embedding events", () => {
    const list = buildTournamentItemList({
      tournaments: [tournament()],
      total: 1,
      origin: "https://example.com",
      name: "Tournois Rocket League",
    });

    expect(list.url).toBe("https://example.com/tournaments");
    expect(list.name).toBe("Tournois Rocket League");
    expect(list.itemListElement[0]?.url).toBe("https://example.com/tournaments/t1");
    expect(list.itemListElement[0]).not.toHaveProperty("item");
  });
});
