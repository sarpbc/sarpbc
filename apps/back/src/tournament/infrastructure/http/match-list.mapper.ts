import type {
  MatchBlockItem,
  MatchBlockState,
  ProfileMatchListItem,
  TournamentEventRef,
  TournamentMatchListItem,
} from "@sarpbc/types";
import { Match, matchPublicSlug } from "../../domain/competition";
import { isRedistributable } from "../../../common/domain/data-source";
import { isMatchBlockLive } from "../../application/match/match-blocks";

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
    slug: string;
    event: TournamentEventRef;
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
      slug: tournament.slug,
      event: tournament.event,
      league: tournament.league
        ? {
            id: tournament.league.id,
            name: tournament.league.name,
          }
        : undefined,
    },
  };
}

function matchBlockState(match: Match, now: Date): MatchBlockState {
  if (isMatchBlockLive(match, now)) {
    return "live";
  }
  return match.hasEnded() || (match.beginAt !== null && match.beginAt <= now)
    ? "finished"
    : "upcoming";
}

export function mapMatchBlockItem(match: Match, now: Date, commentCount: number): MatchBlockItem {
  return {
    ...mapMatchListItem(match),
    state: matchBlockState(match, now),
    startgg: !isRedistributable(match.source) || !isRedistributable(match.tournament.source),
    commentCount,
  };
}

export function mapProfileMatchListItem(match: Match): ProfileMatchListItem {
  return { ...mapMatchListItem(match), status: match.status, endAt: match.endAt };
}

export function mapTournamentMatchListItem(match: Match): TournamentMatchListItem {
  return {
    id: match.id,
    publicId: match.publicId,
    slug: matchPublicSlug(match),
    status: match.status,
    beginAt: match.beginAt,
    endAt: match.endAt,
    numberOfGames: match.numberOfGames,
    participants: match.participants.map((participant) => ({
      id: participant.id,
      team: { id: participant.team.id, name: participant.team.name },
    })),
    results: match.results.map((result) => ({
      participant: result.participant.id,
      score: result.score,
    })),
  };
}

export function withPublicSlug(
  match: Match,
): Omit<Match, "slug" | "hasEnded" | "isDecided"> & { slug: string } {
  return { ...match, slug: matchPublicSlug(match) };
}
