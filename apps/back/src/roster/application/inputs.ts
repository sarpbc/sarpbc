import { ContractRole, PlayerStatus } from "../domain/roster";
import type { DataSource } from "../../common/domain/data-source";
export interface CreatePlayerInput {
  name: string;
  source?: Exclude<DataSource, "pandascore">;
  teamId?: string;
  firstName?: string;
  lastName?: string;
  birthday?: string;
  nationality?: string;
  imageUrl?: string;
  slug?: string;
  status?: PlayerStatus;
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
  status?: PlayerStatus;
}

export interface RosterMoveInput {
  teamId: string;
  effectiveDate: string;
  sourceUrl: string;
}

export interface JoinTeamInput extends RosterMoveInput {
  role?: ContractRole;
}

export interface LeaveTeamInput extends RosterMoveInput {
  status: PlayerStatus.FREE_AGENT | PlayerStatus.RETIRED;
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

export interface SourcedContractInput extends CreateContractInput {
  sourceUrl: string;
}

export interface SourcedContractUpdate extends UpdateContractInput {
  sourceUrl: string;
}

export interface CreateTeamInput {
  name: string;
  source?: Exclude<DataSource, "pandascore">;
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
  logoLightUrl?: string;
  logoDarkUrl?: string;
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
