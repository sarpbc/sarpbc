import { ContractRole } from "../../player/domain/roster";
export interface CreatePlayerInput {
  name: string;
  teamId?: string;
  firstName?: string;
  lastName?: string;
  birthday?: string;
  nationality?: string;
  imageUrl?: string;
  slug?: string;
}

export interface UpdatePlayerInput {
  name?: string;
  teamId?: string | null;
  firstName?: string;
  lastName?: string;
  birthday?: string;
  nationality?: string;
  imageUrl?: string;
  slug?: string;
}

export interface CreateContractInput {
  teamId: string;
  startDate: string;
  endDate?: string;
  role?: ContractRole;
}

export interface UpdateContractInput {
  teamId?: string;
  startDate?: string;
  endDate?: string | null;
  role?: ContractRole;
}
