import type {
  DataSource,
  League as LeagueResponse,
  TeamSummary,
  TournamentDetail,
  TournamentDetailParticipant,
  TournamentEventRef,
  TournamentFormat,
  TournamentListItem,
} from "@sarpbc/types";
import { mapPlayer, mapTeamSummary } from "../../../roster/infrastructure/http/player.mapper";
import { League } from "../../domain/league";
import { Tournament } from "../../domain/tournament";
import { TournamentParticipant } from "../../domain/tournament-participant";
import { matchPublicSlug } from "../../domain/match";
import { toEventRef } from "../../domain/tournament-event";
import { mapParticipantRef } from "./participant-ref.mapper";

export interface TournamentParticipantResponse {
  id: string;
  team: TeamSummary | null;
  players: ReturnType<typeof mapPlayer>[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TournamentResponse {
  id: string;
  pandascoreId: number | null;
  source: DataSource;
  format: TournamentFormat;
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

export const mapLeague = (league: League | null | undefined): LeagueResponse | null => {
  if (league?.id === undefined || league?.id === "") {
    return null;
  }

  return {
    id: league.id,
    imageUrl: league.imageUrl,
    name: league.name,
    pandascoreId: league.pandascoreId,
    slug: league.slug,
    url: league.url,
  };
};

const mapParticipant = (participant: TournamentParticipant): TournamentParticipantResponse => ({
  createdAt: participant.createdAt,
  id: participant.id,
  players: participant.players.map((player) => mapPlayer(player)),
  team: participant.team ? mapTeamSummary(participant.team) : null,
  updatedAt: participant.updatedAt,
});

export const mapTournamentListItem = (
  tournament: Tournament,
): TournamentListItem & Pick<TournamentResponse, "beginAt" | "endAt"> => ({
  beginAt: tournament.beginAt,
  endAt: tournament.endAt,
  event: toEventRef(tournament.event),
  format: tournament.format,
  id: tournament.id,
  imageUrl: tournament.imageUrl,
  league: tournament.league
    ? {
        id: tournament.league.id,
        imageUrl: tournament.league.imageUrl,
        name: tournament.league.name,
      }
    : null,
  name: tournament.name,
  participants: tournament.participants.map((participant) =>
    mapParticipantRef(participant, mapTeamSummary),
  ),
  pickemsEnabled: tournament.pickemsEnabled,
  prizepool: tournament.prizepool,
  slug: tournament.slug,
  source: tournament.source,
  type: tournament.type,
  winnerId: tournament.winner?.id ?? null,
});

export const mapTournament = (tournament: Tournament): TournamentResponse => ({
  beginAt: tournament.beginAt,
  country: tournament.country,
  createdAt: tournament.createdAt,
  description: tournament.description,
  endAt: tournament.endAt,
  event: toEventRef(tournament.event),
  format: tournament.format,
  hasBracket: tournament.hasBracket,
  id: tournament.id,
  imageUrl: tournament.imageUrl,
  league: mapLeague(tournament.league),
  name: tournament.name,
  pandascoreId: tournament.pandascoreId,
  participants: tournament.participants.map(mapParticipant),
  pickemsEnabled: tournament.pickemsEnabled,
  prizepool: tournament.prizepool,
  slug: tournament.slug,
  source: tournament.source,
  tier: tournament.tier,
  type: tournament.type,
  updatedAt: tournament.updatedAt,
  winner: tournament.winner ? mapParticipant(tournament.winner) : null,
  winnerType: tournament.winnerType,
});

const mapDetailParticipant = (participant: TournamentParticipant): TournamentDetailParticipant => ({
  id: participant.id,
  players: participant.players.map((player) => ({
    id: player.id,
    imageUrl: player.imageUrl,
    name: player.name,
    nationality: player.nationality,
    slug: player.slug,
  })),
  rosterSourceUrl: participant.rosterSourceUrl,
  team: participant.team ? mapTeamSummary(participant.team) : null,
});

export type TournamentDetailResponse = TournamentDetail &
  Pick<TournamentResponse, "beginAt" | "endAt">;

export const mapTournamentDetail = (tournament: Tournament): TournamentDetailResponse => ({
  beginAt: tournament.beginAt,
  country: tournament.country,
  endAt: tournament.endAt,
  event: toEventRef(tournament.event),
  format: tournament.format,
  hasBracket: tournament.hasBracket,
  id: tournament.id,
  imageUrl: tournament.imageUrl,
  league: tournament.league
    ? {
        id: tournament.league.id,
        imageUrl: tournament.league.imageUrl,
        name: tournament.league.name,
        url: tournament.league.url,
      }
    : null,
  matches: tournament.matches.map((match) => ({
    beginAt: match.beginAt,
    endAt: match.endAt,
    forfeitedBy: match.forfeitedBy?.id ?? null,
    id: match.id,
    name: match.name,
    numberOfGames: match.numberOfGames,
    participants: match.participants.map((participant) =>
      mapParticipantRef(participant, mapTeamSummary),
    ),
    previousMatches: match.previousMatches.map((link) => ({
      previousMatch: link.previousMatch.id,
      type: link.type,
    })),
    publicId: match.publicId,
    results: match.results.map((result) => ({
      participant: result.participant.id,
      score: result.score,
    })),
    slug: matchPublicSlug({ name: match.name, participants: match.participants, tournament }),
    sourceUrl: match.sourceUrl,
    status: match.status,
    winnerId: match.winner?.id ?? null,
  })),
  name: tournament.name,
  participants: tournament.participants.map(mapDetailParticipant),
  pickemsEnabled: tournament.pickemsEnabled,
  prizepool: tournament.prizepool,
  slug: tournament.slug,
  source: tournament.source,
  tier: tournament.tier,
  type: tournament.type,
  watchStreams: tournament.watchStreams(),
  winner: tournament.winner ? mapParticipantRef(tournament.winner, mapTeamSummary) : null,
});
