import type { Tournament } from "~/types/tournament";
import { SITE_ORIGIN } from "~/utils/calendar/ics";
import { compactJsonLd, SCHEMA_ORG, type JsonLdNode } from "./jsonLd";
import { buildTournamentSportsEvent, type SportsEventLd } from "./tournamentSportsEvent";

export interface ListItemLd extends JsonLdNode {
  "@type": "ListItem";
  position: number;
  item: SportsEventLd;
}

export interface ItemListLd extends JsonLdNode {
  "@type": "ItemList";
  name: string;
  url: string;
  numberOfItems: number;
  itemListElement: ListItemLd[];
}

export interface BuildTournamentItemListOptions {
  tournaments: Tournament[];
  total: number;
  positionOffset?: number;
  origin?: string;
  now?: number;
  name?: string;
}

export function buildTournamentItemList(options: BuildTournamentItemListOptions): ItemListLd {
  const origin = options.origin ?? SITE_ORIGIN;
  const url = `${origin}/tournaments`;
  const positionOffset = options.positionOffset ?? 0;

  return compactJsonLd({
    "@context": SCHEMA_ORG,
    "@type": "ItemList",
    name: options.name ?? "Rocket League tournaments",
    url,
    numberOfItems: options.total,
    itemListElement: options.tournaments.map((tournament, index) =>
      compactJsonLd({
        "@type": "ListItem",
        position: positionOffset + index + 1,
        item: buildTournamentSportsEvent(tournament, {
          origin,
          now: options.now,
        }),
      }),
    ),
  });
}
