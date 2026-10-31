import type { CONTRACT_ROLES, PLAYER_CONTRACT_ROLES, STAFF_CONTRACT_ROLES } from "./index";

export type PlayerContractRole = (typeof PLAYER_CONTRACT_ROLES)[number];

export type StaffContractRole = (typeof STAFF_CONTRACT_ROLES)[number];

export type ContractRole = (typeof CONTRACT_ROLES)[number];

export interface PlayerContract {
  id: string;
  startDate: string;
  endDate: string | null;
  role: ContractRole;
  createdAt: string;
  team: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    darkModeImageUrl: string | null;
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
