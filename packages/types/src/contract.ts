export type PlayerContractRole = "active" | "benched" | "loaned";

export type StaffContractRole = "coach" | "assistant_coach" | "analyst" | "manager";

export type ContractRole = PlayerContractRole | StaffContractRole;

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
