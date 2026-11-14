import type { DataSource } from "./competition";
import type { TeamLogos } from "./team";
import type { TransferType } from "./transfer";

export const ON_THIS_DAY_LINK_KINDS = ["player", "team", "tournament", "match"] as const;

export type OnThisDayLinkKind = (typeof ON_THIS_DAY_LINK_KINDS)[number];

export interface OnThisDayPlayer {
  name: string;
  slug: string;
}

export interface OnThisDayTeam extends TeamLogos {
  name: string;
  slug: string;
}

export interface OnThisDayTournament {
  name: string;
  slug: string;
  event: { name: string; slug: string };
}

export interface OnThisDaySide {
  team: OnThisDayTeam | null;
  players: OnThisDayPlayer[];
  score: number | null;
}

export interface OnThisDayMatch {
  publicId: number;
  slug: string;
}

export type OnThisDayLink =
  | { kind: "player"; name: string; slug: string }
  | { kind: "team"; name: string; slug: string }
  | { kind: "tournament"; name: string; slug: string; event: { name: string; slug: string } }
  | { kind: "match"; name: string; publicId: number; slug: string };

export interface OnThisDayText {
  en: string;
  fr: string;
}

export type OnThisDayEvent =
  | {
      kind: "title";
      year: number;
      date: string;
      tournament: OnThisDayTournament;
      winner: Omit<OnThisDaySide, "score">;
    }
  | {
      kind: "final";
      year: number;
      date: string;
      tournament: OnThisDayTournament;
      match: OnThisDayMatch;
      winner: OnThisDaySide;
      loser: OnThisDaySide;
    }
  | {
      kind: "transfer";
      year: number;
      date: string;
      type: TransferType;
      player: OnThisDayPlayer;
      team: OnThisDayTeam;
    }
  | {
      kind: "fact";
      year: number | null;
      text: OnThisDayText;
      link: OnThisDayLink | null;
      sourceUrl: string | null;
    };

export interface OnThisDay {
  date: string;
  events: OnThisDayEvent[];
}

export interface OnThisDayFactLinkInput {
  kind: OnThisDayLinkKind;
  id: string;
}

export interface OnThisDayFactInput {
  month: number;
  day: number;
  year: number | null;
  textEn: string;
  textFr: string;
  link: OnThisDayFactLinkInput | null;
  sourceUrl: string | null;
}

export interface OnThisDayFact {
  id: string;
  month: number;
  day: number;
  year: number | null;
  textEn: string;
  textFr: string;
  link: (OnThisDayLink & { id: string; source: DataSource | null }) | null;
  sourceUrl: string | null;
}
