export interface UpcomingMatch {
  id: string;
  slug: string;
  beginAt: string | null;
  participants: { id: string; team: { name: string } }[];
  tournament: { id: string; name: string };
}
