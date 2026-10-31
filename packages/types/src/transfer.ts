import type { ContractRole } from "./contract";

export type TransferType = "arrival" | "departure" | "benched" | "loan" | "staff";

export interface Transfer {
  id: string;
  type: TransferType;
  date: string;
  role: ContractRole;
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
