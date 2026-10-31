import type { DataSource } from "./competition";
import type { TournamentEventRef } from "./tournament-event";

export interface PrizeAmount {
  currency: string;
  amount: number;
}

export interface TournamentPrize {
  id: string;
  placement: number;
  amount: number;
  currency: string;
  team: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    darkModeImageUrl: string | null;
  };
  players: { id: string; name: string; slug: string }[];
}

export interface TournamentPrizes {
  source: DataSource;
  prizepool: string | null;
  prizes: TournamentPrize[];
}

export interface EarningsEntry {
  id: string;
  placement: number;
  amount: number;
  currency: string;
  team: { id: string; name: string; slug: string };
  tournament: {
    id: string;
    name: string;
    slug: string;
    source: DataSource;
    beginAt: Date | string | null;
    endAt: Date | string | null;
    event: TournamentEventRef;
  };
}

export interface EarningsYear {
  year: number | null;
  totals: PrizeAmount[];
  entries: EarningsEntry[];
}

export interface ProfileEarnings {
  totals: PrizeAmount[];
  years: EarningsYear[];
}
