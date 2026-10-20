import type { OfficialMatchStream } from "../../domain/official-match-stream";
import type { TournamentSource } from "../../domain/tournament-source";
import {
  mapPlayer,
  mapTeamSummary,
  type TeamSummaryResponse,
} from "../../../player/infrastructure/http/player.mapper";
import {
  BracketLink,
  League,
  Match,
  Tournament,
  TournamentParticipant,
  matchPublicSlug,
} from "../../domain/competition";

export interface LeagueResponse {
  id: string;
  pandascoreId: number;
  name: string;
  slug: string | null;
  url: string | null;
  imageUrl: string | null;
}

export interface TournamentParticipantResponse {
  id: string;
  team: TeamSummaryResponse;
  players: ReturnType<typeof mapPlayer>[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TournamentMatchResultResponse {
  participant: string;
  score: number;
}

export interface TournamentBracketLinkResponse {
  match: string;
  previousMatch: string;
  type: "winner" | "loser";
}

export interface TournamentMatchResponse {
  id: string;
  publicId: number;
  pandascoreId: number | null;
  name: string;
  slug: string;
  beginAt: Date | null;
  endAt: Date | null;
  status: string | null;
  numberOfGames: number | null;
  createdAt: Date;
  updatedAt: Date;
  participants: TournamentParticipantResponse[];
  winner: TournamentParticipantResponse | null;
  results: TournamentMatchResultResponse[];
  previousMatches: TournamentBracketLinkResponse[];
  officialStreams: OfficialMatchStream[];
}

export interface TournamentResponse {
  id: string;
  pandascoreId: number | null;
  source: TournamentSource;
  name: string;
  description: string | null;
  slug: string | null;
  serie: string | null;
  tier: string | null;
  beginAt: Date | null;
  endAt: Date | null;
  winnerType: string | null;
  type: string | null;
  country: string | null;
  prizepool: string | null;
  imageUrl: string | null;
  pickemsEnabled: boolean;
  hasBracket: boolean;
  createdAt: Date;
  updatedAt: Date;
  league: LeagueResponse | null;
  winner: TournamentParticipantResponse | null;
  participants?: TournamentParticipantResponse[];
  matches?: TournamentMatchResponse[];
}

function mapLeague(league: League | null | undefined): LeagueResponse | null {
  if (!league?.id) {
    return null;
  }

  return {
    id: league.id,
    pandascoreId: league.pandascoreId,
    name: league.name,
    slug: league.slug,
    url: league.url,
    imageUrl: league.imageUrl,
  };
}

function mapParticipant(participant: TournamentParticipant): TournamentParticipantResponse {
  return {
    id: participant.id,
    team: mapTeamSummary(participant.team),
    players: participant.players.map((player) => mapPlayer(player)),
    createdAt: participant.createdAt,
    updatedAt: participant.updatedAt,
  };
}

function mapBracketLink(link: BracketLink, fallbackMatchId: string): TournamentBracketLinkResponse {
  return {
    match: link.match?.id ?? fallbackMatchId,
    previousMatch: link.previousMatch.id,
    type: link.type,
  };
}

function mapMatch(match: Match, tournament: Tournament): TournamentMatchResponse {
  return {
    id: match.id,
    publicId: match.publicId,
    pandascoreId: match.pandascoreId,
    name: match.name,
    slug: matchPublicSlug({ name: match.name, participants: match.participants, tournament }),
    beginAt: match.beginAt,
    endAt: match.endAt,
    status: match.status,
    numberOfGames: match.numberOfGames,
    createdAt: match.createdAt,
    updatedAt: match.updatedAt,
    participants: match.participants.map(mapParticipant),
    winner: match.winner ? mapParticipant(match.winner) : null,
    results: match.results.map((result) => ({
      participant: result.participant.id,
      score: result.score,
    })),
    previousMatches: match.previousMatches.map((link) => mapBracketLink(link, match.id)),
    officialStreams: match.officialStreams ?? [],
  };
}

export function mapTournament(
  tournament: Tournament,
  options?: { includeMatches?: boolean },
): TournamentResponse {
  const includeMatches = options?.includeMatches ?? false;

  const mapped: TournamentResponse = {
    id: tournament.id,
    pandascoreId: tournament.pandascoreId,
    source: tournament.source,
    name: tournament.name,
    description: tournament.description,
    slug: tournament.slug,
    serie: tournament.serie,
    tier: tournament.tier,
    beginAt: tournament.beginAt,
    endAt: tournament.endAt,
    winnerType: tournament.winnerType,
    type: tournament.type,
    country: tournament.country,
    prizepool: tournament.prizepool,
    imageUrl: tournament.imageUrl,
    pickemsEnabled: tournament.pickemsEnabled,
    hasBracket: tournament.hasBracket,
    createdAt: tournament.createdAt,
    updatedAt: tournament.updatedAt,
    league: mapLeague(tournament.league),
    winner: tournament.winner ? mapParticipant(tournament.winner) : null,
    participants: tournament.participants.map(mapParticipant),
  };
  if (includeMatches) {
    mapped.matches = tournament.matches.map((match) => mapMatch(match, tournament));
  }
  return mapped;
}
