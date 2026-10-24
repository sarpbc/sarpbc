import { ContractRole } from "../../player/domain/roster";
export interface CreateTeamInput {
  name: string;
  location?: string;
  imageUrl?: string;
  darkModeImageUrl?: string;
  slug?: string;
}

export interface UpdateTeamInput {
  name?: string;
  location?: string;
  imageUrl?: string;
  darkModeImageUrl?: string;
  slug?: string;
  active?: boolean;
}

export interface CreateTeamContractInput {
  playerId: string;
  startDate: string;
  endDate?: string;
  role?: ContractRole;
}

export interface UpdateTeamContractInput {
  playerId?: string;
  startDate?: string;
  endDate?: string | null;
  role?: ContractRole;
}
