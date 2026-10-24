import type {
  TournamentDetail,
  TournamentDetailParticipant,
  TournamentEventRef,
  TournamentListItem,
} from "@sarpbc/types";
import type { DataSource } from "../../../common/domain/data-source";
import {
  mapPlayer,
  mapTeamSummary,
  type TeamSummaryResponse,
} from "../../../roster/infrastructure/http/player.mapper";
import {
  League,
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

export interface TournamentResponse {
  id: string;
  pandascoreId: number | null;
  source: DataSource;
  name: string;
  description: string | null;
  slug: string;
  event: TournamentEventRef;
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
  participants: TournamentParticipantResponse[];
}

export function mapLeague(league: League | null | undefined): LeagueResponse | null {
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

export function mapTournamentListItem(
  tournament: Tournament,
): TournamentListItem & Pick<TournamentResponse, "beginAt" | "endAt"> {
  return {
    id: tournament.id,
    source: tournament.source,
    name: tournament.name,
    slug: tournament.slug,
    event: { id: tournament.event.id, slug: tournament.event.slug, name: tournament.event.name },
    type: tournament.type,
    prizepool: tournament.prizepool,
    imageUrl: tournament.imageUrl,
    beginAt: tournament.beginAt,
    endAt: tournament.endAt,
    pickemsEnabled: tournament.pickemsEnabled,
    winnerId: tournament.winner?.id ?? null,
    league: tournament.league
      ? {
          id: tournament.league.id,
          name: tournament.league.name,
          imageUrl: tournament.league.imageUrl,
        }
      : null,
    participants: tournament.participants.map((participant) => ({
      id: participant.id,
      team: mapTeamSummary(participant.team),
    })),
  };
}

export function mapTournament(tournament: Tournament): TournamentResponse {
  return {
    id: tournament.id,
    pandascoreId: tournament.pandascoreId,
    source: tournament.source,
    name: tournament.name,
    description: tournament.description,
    slug: tournament.slug,
    event: { id: tournament.event.id, slug: tournament.event.slug, name: tournament.event.name },
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
}

function mapDetailParticipant(participant: TournamentParticipant): TournamentDetailParticipant {
  return {
    id: participant.id,
    team: mapTeamSummary(participant.team),
    players: participant.players.map((player) => ({
      id: player.id,
      name: player.name,
      slug: player.slug,
      nationality: player.nationality,
    })),
  };
}

export type TournamentDetailResponse = TournamentDetail &
  Pick<TournamentResponse, "beginAt" | "endAt">;

export function mapTournamentDetail(tournament: Tournament): TournamentDetailResponse {
  return {
    id: tournament.id,
    source: tournament.source,
    name: tournament.name,
    slug: tournament.slug,
    event: { id: tournament.event.id, slug: tournament.event.slug, name: tournament.event.name },
    tier: tournament.tier,
    type: tournament.type,
    country: tournament.country,
    prizepool: tournament.prizepool,
    imageUrl: tournament.imageUrl,
    beginAt: tournament.beginAt,
    endAt: tournament.endAt,
    pickemsEnabled: tournament.pickemsEnabled,
    hasBracket: tournament.hasBracket,
    league: tournament.league
      ? {
          id: tournament.league.id,
          name: tournament.league.name,
          imageUrl: tournament.league.imageUrl,
          url: tournament.league.url,
        }
      : null,
    winner: tournament.winner
      ? { id: tournament.winner.id, team: mapTeamSummary(tournament.winner.team) }
      : null,
    participants: tournament.participants.map(mapDetailParticipant),
    matches: tournament.matches.map((match) => ({
      id: match.id,
      publicId: match.publicId,
      slug: matchPublicSlug({ name: match.name, participants: match.participants, tournament }),
      name: match.name,
      status: match.status,
      beginAt: match.beginAt,
      endAt: match.endAt,
      numberOfGames: match.numberOfGames,
      winnerId: match.winner?.id ?? null,
      participants: match.participants.map((participant) => ({
        id: participant.id,
        team: mapTeamSummary(participant.team),
      })),
      results: match.results.map((result) => ({
        participant: result.participant.id,
        score: result.score,
      })),
      previousMatches: match.previousMatches.map((link) => ({
        previousMatch: link.previousMatch.id,
        type: link.type,
      })),
    })),
  };
}
