import { describe, expect, it } from "vitest";
import type { Tournament } from "~/types/tournament";
import { SCHEMA_ORG } from "./jsonLd";
import { buildTournamentItemList } from "./tournamentItemList";

const NOW = Date.parse("2026-08-17T12:00:00.000Z");

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
        tournament({ id: "a", name: "Open 1" }),
        tournament({ id: "b", name: "Open 2" }),
      ],
      total: 42,
      positionOffset: 20,
      now: NOW,
    });

    expect(list["@context"]).toBe(SCHEMA_ORG);
    expect(list["@type"]).toBe("ItemList");
    expect(list.url).toBe("https://sarpbc.org/tournaments");
    expect(list.numberOfItems).toBe(42);
    expect(list.itemListElement).toHaveLength(2);
    expect(list.itemListElement[0]?.position).toBe(21);
    expect(list.itemListElement[1]?.position).toBe(22);
    expect(list.itemListElement[0]?.item["@type"]).toBe("SportsEvent");
    expect(list.itemListElement[0]?.item["@context"]).toBeUndefined();
    expect(list.itemListElement[0]?.item.name).toBe("Open 1");
  });

  it("emits an empty item list without Offer schema", () => {
    const list = buildTournamentItemList({
      tournaments: [],
      total: 0,
      now: NOW,
    });
    const serialized = JSON.stringify(list);

    expect(list.itemListElement).toEqual([]);
    expect(serialized).not.toContain("Offer");
    expect(serialized).not.toContain("priceCurrency");
  });
});
