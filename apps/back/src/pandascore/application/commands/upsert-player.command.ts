export interface UpsertPlayerCommand {
  name: string;
  slug: string;
  firstName?: string;
  lastName?: string;
  birthday?: Date;
  nationality?: string;
  imageUrl?: string;
  /** PandaScore role string (e.g. "Coach"); omitted/undefined means leave unchanged on update. */
  role?: string | null;
  teamSlug?: string;
}
