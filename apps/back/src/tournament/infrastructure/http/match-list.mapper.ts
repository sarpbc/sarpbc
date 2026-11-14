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
    beginAt: match.beginAt?.toISOString() ?? null,
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
  commentCount,
  startgg: !isRedistributable(match.source) || !isRedistributable(match.tournament.source),
  state: matchBlockState(match, now),
});

export const mapProfileMatchListItem = (match: Match): ProfileMatchListItem => ({
  ...mapMatchListItem(match),
  endAt: match.endAt,
  status: match.status,
});

export const mapTournamentMatchListItem = (match: Match): TournamentMatchListItem => ({
  beginAt: match.beginAt,
  endAt: match.endAt,
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
});

export const withPublicSlug = (
  match: Match,
): Omit<Match, "hasEnded" | "isDecided" | "stampEnd" | "inheritedStreams" | "watchStreams"> & {
  slug: string;
} => ({
  beginAt: match.beginAt,
  createdAt: match.createdAt,
  endAt: match.endAt,
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
