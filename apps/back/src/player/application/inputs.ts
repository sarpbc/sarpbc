import { ContractRole, PlayerStatus, RosterRole } from "../../player/domain/roster";
export interface CreatePlayerInput {
  name: string;
  teamId?: string;
  firstName?: string;
  lastName?: string;
  birthday?: string;
  nationality?: string;
  imageUrl?: string;
  slug?: string;
  status?: PlayerStatus;
  role?: RosterRole;
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
  role?: RosterRole;
}

export interface RosterMoveInput {
  teamId: string;
  effectiveDate: string;
  sourceUrl: string;
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
