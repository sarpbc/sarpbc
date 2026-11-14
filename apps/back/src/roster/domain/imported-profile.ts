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
