export interface DirectorySearchProps {
  name: string;
  start: string;
  limit: number;
  offset: number;
}

export interface ContractMovementFilter {
  teamId?: string;
  playerId?: string;
}
