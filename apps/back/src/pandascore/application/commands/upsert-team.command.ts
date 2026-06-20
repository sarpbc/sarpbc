export interface UpsertTeamCommand {
  pandascoreId?: number;
  name: string;
  slug: string;
  location?: string;
  imageUrl?: string;
}
