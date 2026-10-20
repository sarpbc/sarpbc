import { Match, matchPublicSlug } from "../../domain/competition";

export interface MatchListItemResponse {
  id: string;
  publicId: number;
  slug: string;
  beginAt: Date | null;
  participants: { id: string; team: { name: string } }[];
  results: { participant: string; score: number }[];
  tournament: {
    id: string;
    name: string;
    serie: string | null;
    league?: { id: string; name: string };
  };
}

export function mapMatchListItem(match: Match): MatchListItemResponse {
  const participants = match.participants;
  const results = match.results;
  const tournament = match.tournament;

  return {
    id: match.id,
    publicId: match.publicId,
    slug: matchPublicSlug(match),
    beginAt: match.beginAt,
    participants: participants.map((participant) => ({
      id: participant.id,
      team: { name: participant.team.name },
    })),
    results: results.map((result) => ({
      participant: result.participant.id,
      score: result.score,
    })),
    tournament: {
      id: tournament.id,
      name: tournament.name,
      serie: tournament.serie,
      league: tournament.league
        ? {
            id: tournament.league.id,
            name: tournament.league.name,
          }
        : undefined,
    },
  };
}

export function withPublicSlug(match: Match): Omit<Match, "slug"> & { slug: string } {
  return { ...match, slug: matchPublicSlug(match) };
}
