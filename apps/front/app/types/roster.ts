import type { ContractRole } from "@sarpbc/types";

export interface TeamRosterEraMember {
  contractId: string;
  playerId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  role: ContractRole;
}

export interface TeamRosterEra {
  id: string;
  start: string;
  end: string | null;
  isCurrent: boolean;
  members: TeamRosterEraMember[];
  joined: TeamRosterEraMember[];
  left: TeamRosterEraMember[];
}
