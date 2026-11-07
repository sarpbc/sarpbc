import type { ContractRole } from "./contract";
import type { TeamLogos } from "./team";

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
  team: TeamLogos & { id: string; name: string; slug: string };
}
