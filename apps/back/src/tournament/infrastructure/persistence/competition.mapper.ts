import { wrap } from "@mikro-orm/core";
import { log } from "evlog";
import type { TournamentEventRef } from "@sarpbc/types";
import type { League as LeagueRow } from "./league.entity";
import type { TournamentEvent as TournamentEventRow } from "./tournament-event.entity";
import type { TournamentParticipant as TournamentParticipantRow } from "./tournament-participant.entity";
import type { Tournament as TournamentRow } from "./tournament.entity";
import type { Match as MatchRow } from "./match.entity";
import { League } from "../../domain/league";
import { Match, matchPublicSlug } from "../../domain/match";
import type { TournamentSummary } from "../../domain/match";
import { Tournament } from "../../domain/tournament";
import { TournamentParticipant } from "../../domain/tournament-participant";
import { TournamentEvent, toEventRef } from "../../domain/tournament-event";
import { MATCH_TOURNAMENT_POPULATE } from "./match-populate";
import { teamNameAt, toPlayer, toTeam } from "../../../roster/infrastructure/roster-persistence";
import { teamAt } from "../../../roster/domain/team-alias";

export const toLeague = (row: LeagueRow): League =>
  Object.assign(new League(), {
    createdAt: row.createdAt,
    id: row.id,
    imageUrl: row.imageUrl,
    modifiedAt: row.modifiedAt,
    name: row.name,
    pandascoreId: row.pandascoreId,
    slug: row.slug,
    updatedAt: row.updatedAt,
    url: row.url,
  });

export const toTournamentEvent = (row: TournamentEventRow): TournamentEvent =>
  Object.assign(new TournamentEvent(), {
    createdAt: row.createdAt,
    id: row.id,
    league: row.league ? toLeague(row.league) : null,
    name: row.name,
    pandascoreSerieId: row.pandascoreSerieId,
    slug: row.slug,
    streams: row.streams ?? [],
    updatedAt: row.updatedAt,
    viewership: row.viewership ?? null,
  });

export const MATCH_WRITE_POPULATE = [
  ...MATCH_TOURNAMENT_POPULATE,
  "participants.team",
  "participants.players",
  "winner.team",
  "winner.players",
  "results.participant",
  "previousMatches.previousMatch",
] as const;

export const eventRefOf = (row: TournamentEventRow): TournamentEventRef => {
  // An unpopulated reference would silently map to an empty slug and break every public URL.
  if (!wrap(row).isInitialized()) {
    throw new Error(`Tournament event ${row.id} is not populated`);
  }

  return toEventRef(row);
};

const stageDate = (tournament: TournamentRow): Date | null =>
  wrap(tournament).isInitialized() ? tournament.beginAt : null;

export const toParticipant = (
  row: TournamentParticipantRow,
  at?: Date | null,
): TournamentParticipant | null => {
  const { team } = row;
  const tournament: TournamentRow | undefined = row.tournament;

  const loaded =
    wrap(row).isInitialized() &&
    tournament !== undefined &&
    (team ? wrap(team).isInitialized() : row.players.isInitialized());

  if (!loaded) {
    log.warn({ component: "CompetitionMapper", participantId: row.id, skipped: "participant" });

    return null;
  }

  return Object.assign(new TournamentParticipant(), {
    createdAt: row.createdAt,
    id: row.id,
    players: row.players.isInitialized()
      ? row.players
          .getItems()
          .filter((player) => wrap(player).isInitialized())
          .map(toPlayer)
      : [],
    rosterSourceUrl: row.rosterSourceUrl,
    team: team ? teamAt(toTeam(team, false), at === undefined ? stageDate(tournament) : at) : null,
    tournamentId: tournament.id,
    updatedAt: row.updatedAt,
  });
};

const matchDate = (row: MatchRow): Date | null => row.beginAt ?? stageDate(row.tournament);

export const toTournamentSummary = (row: TournamentRow): TournamentSummary => ({
  beginAt: row.beginAt,
  event: eventRefOf(row.event),
  eventStreams: row.event.streams ?? [],
  id: row.id,
  league: row.league ? toLeague(row.league) : null,
  name: row.name,
  pandascoreId: row.pandascoreId,
  pickemsEnabled: row.pickemsEnabled,
  slug: row.slug,
  source: row.source,
  streams: row.streams ?? [],
});

export const toMatch = (row: MatchRow): Match =>
  Object.assign(new Match(), {
    beginAt: row.beginAt,
    createdAt: row.createdAt,
    endAt: row.endAt,
    id: row.id,
    name: row.name,
    numberOfGames: row.numberOfGames,
    officialStreams: row.officialStreams ?? [],
    pandascoreId: row.pandascoreId,
    participants: row.participants.isInitialized()
      ? row.participants
          .getItems()
          .flatMap((participant) => toParticipant(participant, matchDate(row)) ?? [])
      : [],
    previousMatches: row.previousMatches.isInitialized()
      ? row.previousMatches.getItems().map((r) => ({
          id: r.id,
          match: { id: row.id },
          previousMatch: { id: r.previousMatch.id },
          type: r.type,
        }))
      : [],
    publicId: row.publicId,
    results: row.results.isInitialized()
      ? row.results.getItems().map((r) => ({
          id: r.id,
          match: { id: row.id },
          participant: { id: r.participant.id },
          score: r.score,
        }))
      : [],
    source: row.source,
    sourceUrl: row.sourceUrl,
    status: row.status,
    streams: row.streams ?? [],
    tournament: toTournamentSummary(row.tournament),
    updatedAt: row.updatedAt,
    viewership: row.viewership ?? null,
    vods: row.vods ?? [],
    winner: row.winner ? toParticipant(row.winner, matchDate(row)) : null,
  });

export const toTournament = (row: TournamentRow): Tournament =>
  Object.assign(new Tournament(), {
    beginAt: row.beginAt,
    country: row.country,
    createdAt: row.createdAt,
    description: row.description,
    endAt: row.endAt,
    endAtCorrected: row.endAtCorrected,
    event: eventRefOf(row.event),
    eventStreams: row.event.streams ?? [],
    format: row.format,
    hasBracket: row.hasBracket,
    id: row.id,
    imageUrl: row.imageUrl,
    league: row.league ? toLeague(row.league) : null,
    matches: row.matches.isInitialized() ? row.matches.getItems().map(toMatch) : [],
    name: row.name,
    pandascoreId: row.pandascoreId,
    participants: row.participants.isInitialized()
      ? row.participants.getItems().flatMap((participant) => toParticipant(participant) ?? [])
      : [],
    pickemsEnabled: row.pickemsEnabled,
    prizepool: row.prizepool,
    slug: row.slug,
    source: row.source,
    streams: row.streams ?? [],
    tier: row.tier,
    type: row.type,
    updatedAt: row.updatedAt,
    winner: row.winner ? toParticipant(row.winner) : null,
    winnerType: row.winnerType,
  });

export const toMatchSlug = (row: MatchRow): string => {
  const loaded = wrap(row).isInitialized();

  const rowTournament: TournamentRow | undefined = row.tournament;

  const tournament =
    loaded && rowTournament !== undefined && wrap(rowTournament).isInitialized()
      ? rowTournament
      : null;

  const event = tournament && wrap(tournament.event).isInitialized() ? tournament.event : null;

  return matchPublicSlug({
    name: row.name,
    participants:
      loaded && row.participants.isInitialized()
        ? row.participants.getItems().map((participant) => ({
            players: participant.players.isInitialized() ? participant.players.getItems() : [],
            team: participant.team && {
              name: teamNameAt(participant.team, loaded ? matchDate(row) : null),
            },
          }))
        : [],
    tournament: { event: { slug: event?.slug ?? "" }, slug: tournament?.slug ?? "" },
  });
};
