import { InvalidInputError } from "../../common/domain/errors";
import type { DataSource } from "../../common/domain/data-source";
export interface ImportedTeamProfile {
  pandascoreId?: number;
  name: string;
  location?: string;
  imageUrl?: string;
  darkModeImageUrl?: string;
}
export interface ImportedPlayerProfile {
  pandascoreId: number;
  name: string;
  firstName?: string;
  lastName?: string;
  birthday?: Date;
  nationality?: string;
  imageUrl?: string;
  role?: string | null;
}
export enum ContractRole {
  ACTIVE = "active",
  BENCHED = "benched",
  LOANED = "loaned",
  COACH = "coach",
  ASSISTANT_COACH = "assistant_coach",
  ANALYST = "analyst",
  MANAGER = "manager",
}
export enum PlayerStatus {
  ACTIVE = "active",
  FREE_AGENT = "free_agent",
  RETIRED = "retired",
}
function roleFromPandascore(role: string | null): ContractRole {
  switch (
    role
      ?.trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_")
  ) {
    case "coach":
    case "head_coach":
      return ContractRole.COACH;
    case "assistant_coach":
    case "co_coach":
      return ContractRole.ASSISTANT_COACH;
    case "analyst":
      return ContractRole.ANALYST;
    case "manager":
    case "staff":
      return ContractRole.MANAGER;
    default:
      return ContractRole.ACTIVE;
  }
}
export class Team {
  id = "";
  name = "";
  players: Player[] = [];
  active = true;
  location: string | null = null;
  imageUrl: string | null = null;
  darkModeImageUrl: string | null = null;
  slug = "";
  pandascoreId: number | null = null;
  source: DataSource = "manual";
  mergedIntoId: string | null = null;
  synchronizeProfile(input: ImportedTeamProfile): void {
    this.name = input.name;
    if (input.pandascoreId !== undefined) {
      this.pandascoreId = input.pandascoreId;
      this.source = "pandascore";
    }
    if (input.location !== undefined) this.location = input.location;
    if (!this.imageUrl && input.imageUrl) this.imageUrl = input.imageUrl;
    if (!this.darkModeImageUrl && input.darkModeImageUrl)
      this.darkModeImageUrl = input.darkModeImageUrl;
  }
}
export class Player {
  id = "";
  name = "";
  team: Team | null = null;
  birthday: Date | null = null;
  nationality: string | null = null;
  firstName: string | null = null;
  lastName: string | null = null;
  imageUrl: string | null = null;
  role: string | null = null;
  contractRole: ContractRole | null = null;
  status = PlayerStatus.ACTIVE;
  slug = "";
  pandascoreId: number | null = null;
  source: DataSource = "manual";
  mergedIntoId: string | null = null;
  contracts: Contract[] = [];
  photos: PlayerPhoto[] = [];
  synchronizeProfile(input: ImportedPlayerProfile): void {
    this.pandascoreId = input.pandascoreId;
    this.source = "pandascore";
    this.name = input.name;
    this.firstName = input.firstName ?? null;
    this.lastName = input.lastName ?? null;
    this.birthday = input.birthday ? new Date(input.birthday) : null;
    this.nationality = input.nationality ?? null;
    if (!this.imageUrl && input.imageUrl) this.imageUrl = input.imageUrl;
    if (input.role !== undefined) this.role = input.role;
  }
  currentRole(): ContractRole | null {
    if (!this.team) return null;
    return this.contractRole ?? roleFromPandascore(this.role);
  }
  replaceProfilePhoto(url: string | null): string | null {
    const archived = this.imageUrl && this.imageUrl !== url ? this.imageUrl : null;
    this.imageUrl = url;
    return archived;
  }
}
export class Contract {
  id = "";
  player!: Player;
  team!: Team;
  startDate!: Date;
  endDate: Date | null = null;
  role = ContractRole.ACTIVE;
  joinSourceUrl: string | null = null;
  leaveSourceUrl: string | null = null;
  createdAt = new Date();
  close(endDate: Date, sourceUrl: string): void {
    if (endDate < this.startDate)
      throw new InvalidInputError(
        `The departure date precedes the contract start (${isoDay(this.startDate)}).`,
      );
    this.endDate = endDate;
    this.leaveSourceUrl = sourceUrl;
  }
  /** An open contract stands for the current team, which only roster moves change. */
  assertFitsCareer(others: Contract[], currentTeamId: string | null): void {
    if (this.endDate && this.endDate < this.startDate) {
      throw new InvalidInputError(
        `The contract ends (${isoDay(this.endDate)}) before it starts (${isoDay(this.startDate)}).`,
      );
    }
    const stored = others.find((other) => other.id === this.id);
    if (stored && !stored.endDate && stored.team.id === currentTeamId && this.endDate) {
      throw new InvalidInputError(
        `This contract is the player's current ${stored.team.name} contract; record the departure with remove_player_from_team.`,
      );
    }
    if (!this.endDate && this.team.id !== currentTeamId) {
      throw new InvalidInputError(
        `An open contract must be with the player's current team; give ${this.team.name} an end date or record the move with add_player_to_team.`,
      );
    }
    const overlap = others.find(
      (other) =>
        other.id !== this.id &&
        other.team.id === this.team.id &&
        other.startDate < (this.endDate ?? FOREVER) &&
        this.startDate < (other.endDate ?? FOREVER),
    );
    if (overlap) {
      throw new InvalidInputError(
        `This period overlaps contract "${overlap.id}" with ${this.team.name} (${isoDay(overlap.startDate)} to ${overlap.endDate ? isoDay(overlap.endDate) : "now"}); update that contract instead.`,
      );
    }
  }
}
const FOREVER = new Date(8.64e15);
function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
export class PlayerPhoto {
  id = "";
  player!: Player;
  url = "";
  createdAt = new Date();
}
