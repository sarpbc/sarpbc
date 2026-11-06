import type { TeamLogos } from "./team";

const PLAYER_CONTRACT_ROLES = ["active", "benched", "loaned"] as const;

export const STAFF_CONTRACT_ROLES = ["coach", "assistant_coach", "analyst", "manager"] as const;

export const CONTRACT_ROLES = [...PLAYER_CONTRACT_ROLES, ...STAFF_CONTRACT_ROLES] as const;

export type StaffContractRole = (typeof STAFF_CONTRACT_ROLES)[number];

export type ContractRole = (typeof CONTRACT_ROLES)[number];

export interface PlayerContract {
  id: string;
  startDate: string;
  endDate: string | null;
  role: ContractRole;
  createdAt: string;
  team: TeamLogos & {
    id: string;
    name: string;
    slug: string;
    location: string | null;
    pandascoreId: number | null;
  };
}

export interface TeamContract {
  id: string;
  startDate: string;
  endDate: string | null;
  role: ContractRole;
  createdAt: string;
  player: {
    id: string;
    name: string;
    slug: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    nationality: string | null;
    birthday: string | null;
  };
}
