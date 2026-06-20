export interface UpsertLeagueCommand {
  pandascoreId: number;
  name: string;
  slug?: string;
  url?: string | null;
  imageUrl?: string;
  modifiedAt?: Date;
}
