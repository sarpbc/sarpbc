import type { DataSource } from "./competition";
import type { TeamLogos } from "./team";
import type { TournamentEventRef } from "./tournament-event";

export interface PrizeAmount {
  currency: string;
  amount: number;
}

export interface PrizeEntry {
  placement: number;
  amount: number;
  currency: string;
  teamId: string;
  playerIds: string[];
}

export interface TournamentPrize {
  id: string;
  placement: number;
  amount: number;
  currency: string;
  team: Pick<TeamLogos, "imageUrl" | "darkModeImageUrl"> & {
    id: string;
    name: string;
    slug: string;
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
    beginAt: string | null;
    endAt: string | null;
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
