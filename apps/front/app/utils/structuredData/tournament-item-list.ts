import type { TournamentEvent, TournamentListItem } from "@sarpbc/types";
import { tournamentEventPath } from "@sarpbc/utils";
import { SITE_ORIGIN } from "@sarpbc/ui/config";
import { compactJsonLd, SCHEMA_ORG } from "./json-ld";
import type { JsonLdNode } from "./json-ld";

export interface ListItemLd extends JsonLdNode {
  "@type": "ListItem";
  position: number;
  name: string;
  url: string;
}

export interface ItemListLd extends JsonLdNode {
  "@type": "ItemList";
  name: string;
  url: string;
  numberOfItems: number;
  itemListElement: ListItemLd[];
}

export interface BuildTournamentItemListOptions {
  events: TournamentEvent<TournamentListItem>[];
  total: number;
  positionOffset?: number;
  name?: string;
}

export const buildTournamentItemList = (options: BuildTournamentItemListOptions): ItemListLd => {
  const url = `${SITE_ORIGIN}/tournaments`;
  const positionOffset = options.positionOffset ?? 0;

  return compactJsonLd({
    "@context": SCHEMA_ORG,
    "@type": "ItemList",
    name: options.name ?? "Rocket League tournaments",
    url,
    numberOfItems: options.total,
    itemListElement: options.events.map((event, index) =>
      compactJsonLd({
        "@type": "ListItem",
        position: positionOffset + index + 1,
        name: event.name,
        url: `${SITE_ORIGIN}${tournamentEventPath(event.slug)}`,
      }),
    ),
  });
};
