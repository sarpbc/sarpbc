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
export class Team {
  id = "";
  name = "";
  players: Player[] = [];
  location: string | null = null;
  imageUrl: string | null = null;
  darkModeImageUrl: string | null = null;
  slug = "";
  pandascoreId: number | null = null;
  synchronizeProfile(input: ImportedTeamProfile): void {
    this.name = input.name;
    if (input.pandascoreId !== undefined) this.pandascoreId = input.pandascoreId;
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
  slug = "";
  pandascoreId: number | null = null;
  contracts: Contract[] = [];
  photos: PlayerPhoto[] = [];
  synchronizeProfile(input: ImportedPlayerProfile): void {
    this.pandascoreId = input.pandascoreId;
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
  createdAt = new Date();
}
export class PlayerPhoto {
  id = "";
  player!: Player;
  url = "";
  createdAt = new Date();
}
