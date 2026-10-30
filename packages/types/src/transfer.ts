export type TransferType = "arrival" | "departure" | "benched" | "loan";

export interface Transfer {
  id: string;
  type: TransferType;
  /** Calendar day, `YYYY-MM-DD`. */
  date: string;
  sourceUrl: string | null;
  player: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    nationality: string | null;
  };
  team: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    darkModeImageUrl: string | null;
  };
}
