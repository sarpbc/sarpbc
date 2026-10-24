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
}
export enum PlayerStatus {
  ACTIVE = "active",
  FREE_AGENT = "free_agent",
  RETIRED = "retired",
}
export const ROSTER_ROLES = ["player", "coach", "substitute"] as const;
export type RosterRole = (typeof ROSTER_ROLES)[number];
/** Stored in PandaScore's role format, where standard roster players have no role. */
export function rosterRoleLabel(role: RosterRole): string | null {
  switch (role) {
    case "player":
      return null;
    case "coach":
      return "Coach";
    case "substitute":
      return "Substitute";
    default: {
      const unreachable: never = role;
      return unreachable;
    }
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
        `The departure date precedes the contract start (${this.startDate.toISOString().slice(0, 10)}).`,
      );
    this.endDate = endDate;
    this.leaveSourceUrl = sourceUrl;
  }
}
export class PlayerPhoto {
  id = "";
  player!: Player;
  url = "";
  createdAt = new Date();
}
