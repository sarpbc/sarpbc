import { wrap } from "@mikro-orm/core";
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
import { TournamentEvent } from "../../domain/tournament-event";
import { toPlayer, toTeam } from "../../../roster/infrastructure/roster-persistence";
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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
function toEventRef(row: Row.TournamentEvent): TournamentEventRef {
  // An unpopulated reference would silently map to an empty slug and break every public URL.
  if (!wrap(row).isInitialized())
    throw new Error("Tournament event " + row.id + " is not populated");
  return { id: row.id, slug: row.slug, name: row.name };
}
export function toParticipant(row: Row.TournamentParticipant): TournamentParticipant {
  return Object.assign(new TournamentParticipant(), {
    id: row.id,
    tournamentId: row.tournament.id,
    team: toTeam(row.team, false),
    players: row.players.isInitialized() ? row.players.getItems().map(toPlayer) : [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
export function toTournamentSummary(row: Row.Tournament): TournamentSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    event: toEventRef(row.event),
    beginAt: row.beginAt,
    league: row.league ? toLeague(row.league) : null,
    pickemsEnabled: row.pickemsEnabled,
    source: row.source,
    pandascoreId: row.pandascoreId,
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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tournament: toTournamentSummary(row.tournament),
    winner: row.winner ? toParticipant(row.winner) : null,
    participants: row.participants.isInitialized()
      ? row.participants.getItems().map(toParticipant)
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
    name: row.name,
    description: row.description,
    slug: row.slug,
    event: toEventRef(row.event),
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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    league: row.league ? toLeague(row.league) : null,
    winner: row.winner ? toParticipant(row.winner) : null,
    participants: row.participants.isInitialized()
      ? row.participants.getItems().map(toParticipant)
      : [],
    matches: row.matches.isInitialized() ? row.matches.getItems().map(toMatch) : [],
  });
}
/** Safe on partially loaded rows, such as the match reference behind a reply. */
export function toMatchSlug(row: Row.Match): string {
  const loaded = wrap(row).isInitialized();
  const tournament =
    loaded && row.tournament && wrap(row.tournament).isInitialized() ? row.tournament : null;
  const event = tournament && wrap(tournament.event).isInitialized() ? tournament.event : null;
  return matchPublicSlug({
    name: row.name,
    participants: loaded && row.participants.isInitialized() ? row.participants.getItems() : [],
    tournament: { slug: tournament?.slug ?? "", event: { slug: event?.slug ?? "" } },
  });
}
