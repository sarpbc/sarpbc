export interface League {
  id: string;
  pandascoreId: number | null;
  name: string;
  slug: string | null;
  url: string | null;
  imageUrl: string | null;
}

export interface LeagueInput {
  name?: string;
  slug?: string | null;
  url?: string | null;
  imageUrl?: string | null;
}
