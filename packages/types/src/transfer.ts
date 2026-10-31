export type TransferType = "arrival" | "departure" | "benched" | "loan";

export interface Transfer {
  id: string;
  type: TransferType;
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
    logoLightUrl: string | null;
    logoDarkUrl: string | null;
  };
}
