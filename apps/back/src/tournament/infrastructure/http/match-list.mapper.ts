import type {
  MatchBlockItem,
  MatchBlockState,
  MatchListItem,
  ProfileMatchListItem,
  TournamentMatchListItem,
} from "@sarpbc/types";
import { isMatchFinished, isMatchLive } from "@sarpbc/utils";
import { Match, matchPublicSlug } from "../../domain/match";
import { isMatchBlockLive } from "../../application/match/match-blocks";
import { mapParticipantRef } from "./participant-ref.mapper";

export const mapMatchListItem = (match: Match) => {
  const { participants } = match;
  const { results } = match;
  const { tournament } = match;

  return {
    beginAt: match.beginAt?.toISOString() ?? null,
    forfeitedBy: match.forfeitedBy?.id ?? null,
    id: match.id,
    participants: participants.map((participant) =>
      mapParticipantRef(participant, (team) => ({
        darkModeImageUrl: team.darkModeImageUrl,
        imageUrl: team.imageUrl,
        logoDarkUrl: team.logoDarkUrl,
        logoLightUrl: team.logoLightUrl,
        name: team.name,
      })),
    ),
    publicId: match.publicId,
    results: results.map((result) => ({
      participant: result.participant.id,
      score: result.score,
    })),
    slug: matchPublicSlug(match),
    tournament: {
      event: tournament.event,
      id: tournament.id,
      league: tournament.league
        ? {
            id: tournament.league.id,
            name: tournament.league.name,
          }
        : undefined,
      name: tournament.name,
      slug: tournament.slug,
    },
  } satisfies MatchListItem;
};

const matchBlockState = (match: Match, now: Date) => {
  if (isMatchBlockLive(match, now)) {
    return "live" satisfies MatchBlockState;
  }

  return isMatchFinished(match) || isMatchLive(match, now)
    ? "finished"
    : ("upcoming" satisfies MatchBlockState);
};

export const mapMatchBlockItem = (match: Match, now: Date, commentCount: number) =>
  ({
    ...mapMatchListItem(match),
    commentCount,
    state: matchBlockState(match, now),
  }) satisfies MatchBlockItem;

export const mapProfileMatchListItem = (match: Match) =>
  ({
    ...mapMatchListItem(match),
    endAt: match.endAt,
    status: match.status,
  }) satisfies ProfileMatchListItem;

export const mapTournamentMatchListItem = (match: Match) =>
  ({
    beginAt: match.beginAt,
    endAt: match.endAt,
    forfeitedBy: match.forfeitedBy?.id ?? null,
    id: match.id,
    numberOfGames: match.numberOfGames,
    participants: match.participants.map((participant) =>
      mapParticipantRef(participant, (team) => ({
        darkModeImageUrl: team.darkModeImageUrl,
        id: team.id,
        imageUrl: team.imageUrl,
        logoDarkUrl: team.logoDarkUrl,
        logoLightUrl: team.logoLightUrl,
        name: team.name,
      })),
    ),
    publicId: match.publicId,
    results: match.results.map((result) => ({
      participant: result.participant.id,
      score: result.score,
    })),
    slug: matchPublicSlug(match),
    status: match.status,
  }) satisfies TournamentMatchListItem;

export const withPublicSlug = (match: Match) => ({
  beginAt: match.beginAt,
  createdAt: match.createdAt,
  endAt: match.endAt,
  forfeitedBy: match.forfeitedBy?.id ?? null,
  id: match.id,
  name: match.name,
  numberOfGames: match.numberOfGames,
  officialStreams: match.officialStreams,
  pandascoreId: match.pandascoreId,
  participants: match.participants,
  previousMatches: match.previousMatches,
  publicId: match.publicId,
  results: match.results,
  slug: matchPublicSlug(match),
  source: match.source,
  sourceUrl: match.sourceUrl,
  status: match.status,
  streams: match.streams,
  tournament: match.tournament,
  updatedAt: match.updatedAt,
  viewership: match.viewership,
  vods: match.vods,
  winner: match.winner,
});
