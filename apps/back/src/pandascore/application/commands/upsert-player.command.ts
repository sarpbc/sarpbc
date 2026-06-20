export interface UpsertPlayerCommand {
  name: string;
  slug: string;
  firstName?: string;
  lastName?: string;
  birthday?: Date;
  nationality?: string;
  imageUrl?: string;
  teamSlug?: string;
}
