import type {
  MatchBlockItem,
  MatchBlockState,
  MatchListItem,
  ProfileMatchListItem,
  TournamentMatchListItem,
} from "@sarpbc/types";
import { isMatchFinished, isMatchLive } from "@sarpbc/utils";
import { Match, matchPublicSlug } from "../../domain/match";
import { isRedistributable } from "../../../common/domain/data-source";
import { isMatchBlockLive } from "../../application/match/match-blocks";
import { mapParticipantRef } from "./participant-ref.mapper";

export const mapMatchListItem = (match: Match): MatchListItem => {
  const { participants } = match;
  const { results } = match;
  const { tournament } = match;

  return {
    id: match.id,
    publicId: match.publicId,
    slug: matchPublicSlug(match),
    beginAt: match.beginAt?.toISOString() ?? null,
    participants: participants.map((participant) =>
      mapParticipantRef(participant, (team) => ({
        name: team.name,
        imageUrl: team.imageUrl,
        darkModeImageUrl: team.darkModeImageUrl,
        logoLightUrl: team.logoLightUrl,
        logoDarkUrl: team.logoDarkUrl,
      })),
    ),
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
};

const matchBlockState = (match: Match, now: Date): MatchBlockState => {
  if (isMatchBlockLive(match, now)) {
    return "live";
  }

  return isMatchFinished(match) || isMatchLive(match, now) ? "finished" : "upcoming";
};

export const mapMatchBlockItem = (
  match: Match,
  now: Date,
  commentCount: number,
): MatchBlockItem => ({
  ...mapMatchListItem(match),
  state: matchBlockState(match, now),
  startgg: !isRedistributable(match.source) || !isRedistributable(match.tournament.source),
  commentCount,
});

export const mapProfileMatchListItem = (match: Match): ProfileMatchListItem => ({
  ...mapMatchListItem(match),
  status: match.status,
  endAt: match.endAt,
});

export const mapTournamentMatchListItem = (match: Match): TournamentMatchListItem => ({
  id: match.id,
  publicId: match.publicId,
  slug: matchPublicSlug(match),
  status: match.status,
  beginAt: match.beginAt,
  endAt: match.endAt,
  numberOfGames: match.numberOfGames,
  participants: match.participants.map((participant) =>
    mapParticipantRef(participant, (team) => ({
      id: team.id,
      name: team.name,
      imageUrl: team.imageUrl,
      darkModeImageUrl: team.darkModeImageUrl,
      logoLightUrl: team.logoLightUrl,
      logoDarkUrl: team.logoDarkUrl,
    })),
  ),
  results: match.results.map((result) => ({
    participant: result.participant.id,
    score: result.score,
  })),
});

export const withPublicSlug = (
  match: Match,
): Omit<Match, "hasEnded" | "isDecided" | "stampEnd" | "inheritedStreams" | "watchStreams"> & {
  slug: string;
} => ({
  id: match.id,
  publicId: match.publicId,
  pandascoreId: match.pandascoreId,
  source: match.source,
  name: match.name,
  beginAt: match.beginAt,
  endAt: match.endAt,
  status: match.status,
  participants: match.participants,
  winner: match.winner,
  numberOfGames: match.numberOfGames,
  previousMatches: match.previousMatches,
  results: match.results,
  officialStreams: match.officialStreams,
  streams: match.streams,
  viewership: match.viewership,
  vods: match.vods,
  sourceUrl: match.sourceUrl,
  createdAt: match.createdAt,
  updatedAt: match.updatedAt,
  tournament: match.tournament,
  slug: matchPublicSlug(match),
});
