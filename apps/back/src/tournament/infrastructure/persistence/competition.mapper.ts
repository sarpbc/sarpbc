import { wrap } from "@mikro-orm/core";
import { log } from "evlog";
import type { TournamentEventRef } from "@sarpbc/types";
import * as Row from "./tournament.entities";
import {
  League,
  Match,
  Tournament,
  TournamentParticipant,
  matchPublicSlug,
  type TournamentSummary,
} from "../../domain/competition";
import { TournamentEvent, toEventRef } from "../../domain/tournament-event";
import { MATCH_TOURNAMENT_POPULATE } from "./match-populate";
import { teamNameAt, toPlayer, toTeam } from "../../../roster/infrastructure/roster-persistence";
import { teamAt } from "../../../roster/domain/team-alias";

export function toLeague(row: Row.League): League {
  return Object.assign(new League(), {
    id: row.id,
    pandascoreId: row.pandascoreId,
    name: row.name,
    slug: row.slug,
    url: row.url,
    imageUrl: row.imageUrl,
    modifiedAt: row.modifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function toTournamentEvent(row: Row.TournamentEvent): TournamentEvent {
  return Object.assign(new TournamentEvent(), {
    id: row.id,
    pandascoreSerieId: row.pandascoreSerieId,
    slug: row.slug,
    name: row.name,
    league: row.league ? toLeague(row.league) : null,
    streams: row.streams ?? [],
    viewership: row.viewership ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export const MATCH_WRITE_POPULATE = [
  ...MATCH_TOURNAMENT_POPULATE,
  "participants.team",
  "participants.players",
  "winner.team",
  "winner.players",
  "results.participant",
  "previousMatches.previousMatch",
] as const;

export function eventRefOf(row: Row.TournamentEvent): TournamentEventRef {
  // An unpopulated reference would silently map to an empty slug and break every public URL.
  if (!wrap(row).isInitialized()) throw new Error(`Tournament event ${row.id} is not populated`);

  return toEventRef(row);
}

export function toParticipant(
  row: Row.TournamentParticipant,
  at?: Date | null,
): TournamentParticipant | null {
  const { team } = row;
  const tournament: Row.Tournament | undefined = row.tournament;

  const loaded =
    wrap(row).isInitialized() &&
    tournament !== undefined &&
    (team ? wrap(team).isInitialized() : row.players.isInitialized());

  if (!loaded) {
    log.warn({ component: "CompetitionMapper", skipped: "participant", participantId: row.id });

    return null;
  }

  return Object.assign(new TournamentParticipant(), {
    id: row.id,
    tournamentId: tournament.id,
    team: team ? teamAt(toTeam(team, false), at === undefined ? stageDate(tournament) : at) : null,
    players: row.players.isInitialized()
      ? row.players
          .getItems()
          .filter((player) => wrap(player).isInitialized())
          .map(toPlayer)
      : [],
    rosterSourceUrl: row.rosterSourceUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function stageDate(tournament: Row.Tournament): Date | null {
  return wrap(tournament).isInitialized() ? tournament.beginAt : null;
}

function matchDate(row: Row.Match): Date | null {
  return row.beginAt ?? stageDate(row.tournament);
}

export function toTournamentSummary(row: Row.Tournament): TournamentSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    event: eventRefOf(row.event),
    beginAt: row.beginAt,
    league: row.league ? toLeague(row.league) : null,
    pickemsEnabled: row.pickemsEnabled,
    source: row.source,
    pandascoreId: row.pandascoreId,
    streams: row.streams ?? [],
    eventStreams: row.event.streams ?? [],
  };
}

export function toMatch(row: Row.Match): Match {
  return Object.assign(new Match(), {
    id: row.id,
    publicId: row.publicId,
    pandascoreId: row.pandascoreId,
    source: row.source,
    name: row.name,
    beginAt: row.beginAt,
    endAt: row.endAt,
    status: row.status,
    numberOfGames: row.numberOfGames,
    officialStreams: row.officialStreams ?? [],
    streams: row.streams ?? [],
    viewership: row.viewership ?? null,
    vods: row.vods ?? [],
    sourceUrl: row.sourceUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tournament: toTournamentSummary(row.tournament),
    winner: row.winner ? toParticipant(row.winner, matchDate(row)) : null,
    participants: row.participants.isInitialized()
      ? row.participants
          .getItems()
          .flatMap((participant) => toParticipant(participant, matchDate(row)) ?? [])
      : [],
    results: row.results.isInitialized()
      ? row.results.getItems().map((r) => ({
          id: r.id,
          match: { id: row.id },
          participant: { id: r.participant.id },
          score: r.score,
        }))
      : [],
    previousMatches: row.previousMatches.isInitialized()
      ? row.previousMatches.getItems().map((r) => ({
          id: r.id,
          match: { id: row.id },
          previousMatch: { id: r.previousMatch.id },
          type: r.type,
        }))
      : [],
  });
}

export function toTournament(row: Row.Tournament): Tournament {
  return Object.assign(new Tournament(), {
    id: row.id,
    pandascoreId: row.pandascoreId,
    source: row.source,
    format: row.format,
    name: row.name,
    description: row.description,
    slug: row.slug,
    event: eventRefOf(row.event),
    tier: row.tier,
    beginAt: row.beginAt,
    endAt: row.endAt,
    endAtCorrected: row.endAtCorrected,
    winnerType: row.winnerType,
    type: row.type,
    country: row.country,
    prizepool: row.prizepool,
    imageUrl: row.imageUrl,
    pickemsEnabled: row.pickemsEnabled,
    hasBracket: row.hasBracket,
    streams: row.streams ?? [],
    eventStreams: row.event.streams ?? [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    league: row.league ? toLeague(row.league) : null,
    winner: row.winner ? toParticipant(row.winner) : null,
    participants: row.participants.isInitialized()
      ? row.participants.getItems().flatMap((participant) => toParticipant(participant) ?? [])
      : [],
    matches: row.matches.isInitialized() ? row.matches.getItems().map(toMatch) : [],
  });
}

export function toMatchSlug(row: Row.Match): string {
  const loaded = wrap(row).isInitialized();

  const rowTournament: Row.Tournament | undefined = row.tournament;

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
            team: participant.team && {
              name: teamNameAt(participant.team, loaded ? matchDate(row) : null),
            },
            players: participant.players.isInitialized() ? participant.players.getItems() : [],
          }))
        : [],
    tournament: { slug: tournament?.slug ?? "", event: { slug: event?.slug ?? "" } },
  });
}
