import type { TournamentSource } from "./domain/tournament-source";
import { collectionItems } from "../common/serialization/collection-items";
import { mapPlayer } from "../player/player.mapper";
import type { Player } from "../player/player.entities";
import type { Team } from "../player/player.entities";
import {
  BracketLink,
  League,
  Match,
  MatchResult,
  Tournament,
  TournamentParticipant,
} from "./tournament.entities";

export interface LeagueResponse {
  id: string;
  pandascoreId: number;
  name: string;
  slug: string | null;
  url: string | null;
  imageUrl: string | null;
}

export interface TournamentTeamResponse {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  location: string | null;
}

export interface TournamentParticipantResponse {
  id: string;
  team: TournamentTeamResponse;
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
  pandascoreId: number | null;
  name: string;
  slug: string | null;
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

function mapParticipantTeam(team: Team): TournamentTeamResponse {
  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    imageUrl: team.imageUrl,
    location: team.location,
  };
}

function mapParticipant(participant: TournamentParticipant): TournamentParticipantResponse {
  return {
    id: participant.id,
    team: mapParticipantTeam(participant.team),
    players: collectionItems<Player>(participant.players).map((player) => mapPlayer(player)),
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

function mapMatch(match: Match): TournamentMatchResponse {
  return {
    id: match.id,
    pandascoreId: match.pandascoreId,
    name: match.name,
    slug: match.slug,
    beginAt: match.beginAt,
    endAt: match.endAt,
    status: match.status,
    numberOfGames: match.numberOfGames,
    createdAt: match.createdAt,
    updatedAt: match.updatedAt,
    participants: collectionItems<TournamentParticipant>(match.participants).map(mapParticipant),
    winner: match.winner ? mapParticipant(match.winner) : null,
    results: collectionItems<MatchResult>(match.results).map((result) => ({
      participant: result.participant.id,
      score: result.score,
    })),
    previousMatches: collectionItems<BracketLink>(match.previousMatches).map((link) =>
      mapBracketLink(link, match.id),
    ),
  };
}

export function mapTournament(
  tournament: Tournament,
  options?: { includeMatches?: boolean },
): TournamentResponse {
  const includeMatches = options?.includeMatches ?? false;

  return {
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
    prizepool: tournament.prizepool,
    imageUrl: tournament.imageUrl,
    pickemsEnabled: tournament.pickemsEnabled,
    hasBracket: tournament.hasBracket,
    createdAt: tournament.createdAt,
    updatedAt: tournament.updatedAt,
    league: mapLeague(tournament.league),
    winner: tournament.winner ? mapParticipant(tournament.winner) : null,
    participants: collectionItems<TournamentParticipant>(tournament.participants).map(
      mapParticipant,
    ),
    ...(includeMatches
      ? { matches: collectionItems<Match>(tournament.matches).map(mapMatch) }
      : {}),
  };
}
