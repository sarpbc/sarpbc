import type { DataSource, Stream, NewsArticleAdmin } from "@sarpbc/types";
import { isoDay, participantName } from "@sarpbc/utils";
import { isRedistributable } from "../../common/domain/data-source";
import type { Contract } from "../../roster/domain/contract";
import type { Player } from "../../roster/domain/player";
import type { Team } from "../../roster/domain/team";
import type { TeamAlias } from "../../roster/domain/team-alias";
import type { League } from "../../tournament/domain/league";
import type { Match } from "../../tournament/domain/match";
import type { Tournament } from "../../tournament/domain/tournament";
import type { TournamentParticipant } from "../../tournament/domain/tournament-participant";
import { isEventSynced } from "../../tournament/domain/tournament-event";
import type { EventListing } from "../../tournament/application/ports";
import { mapMatchListItem } from "../../tournament/infrastructure/http/match-list.mapper";
import {
  adminNewsEditUrl,
  eventUrl,
  matchUrl,
  newsUrl,
  playerUrl,
  teamUrl,
  tournamentUrl,
} from "./urls";

const days = (dates: (Date | null)[]) =>
  dates.flatMap((date) => (date === null ? [] : [date.getTime()]));

const timeOf = (date: Date | null) => date?.getTime() ?? Number.POSITIVE_INFINITY;

/** start.gg teams may play in a redistributable match; only the match and tournament source count. */
export const isRedistributableMatch = (match: Match) =>
  isRedistributable(match.source) && isRedistributable(match.tournament.source);

export const redistributableStreams = (streams: readonly Stream[]) =>
  streams.filter((stream) => isRedistributable(stream.source)) satisfies Stream[];

export const mapPlayerSummary = (player: Player) => ({
  id: player.id,
  name: player.name,
  nationality: player.nationality,
  role: player.currentRole(),
  slug: player.slug,
  source: player.source,
  status: player.status,
  team: player.team
    ? {
        id: player.team.id,
        name: player.team.name,
        slug: player.team.slug,
        source: player.team.source,
        url: teamUrl(player.team.slug),
      }
    : null,
  url: playerUrl(player.slug),
});

export const mapCareer = (player: Player, contracts: Contract[]) => ({
  contracts: contracts
    .toSorted((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .map((contract) => ({
      endDate: contract.endDate ? isoDay(contract.endDate) : null,
      id: contract.id,
      joinSourceUrl: contract.joinSourceUrl,
      leaveSourceUrl: contract.leaveSourceUrl,
      role: contract.role,
      startDate: isoDay(contract.startDate),
      team: { id: contract.team.id, name: contract.team.name, slug: contract.team.slug },
    })),
  player: {
    currentTeamId: player.team?.id ?? null,
    id: player.id,
    name: player.name,
    slug: player.slug,
  },
});

export const mapTeamAlias = (alias: TeamAlias) => ({
  from: alias.from,
  id: alias.id,
  logoUrl: alias.logoUrl,
  name: alias.name,
  pandascoreId: alias.pandascoreId,
  sourceUrl: alias.sourceUrl,
  to: alias.to,
});

export const mapTeamSummary = (team: Team) => ({
  active: team.active,
  formerNames: team.aliases.map(mapTeamAlias),
  id: team.id,
  location: team.location,
  logoDarkUrl: team.logoDarkUrl,
  logoLightUrl: team.logoLightUrl,
  name: team.name,
  players: team.players.map((player) => ({
    id: player.id,
    name: player.name,
    role: player.currentRole(),
    slug: player.slug,
    source: player.source,
    url: playerUrl(player.slug),
  })),
  slug: team.slug,
  source: team.source,
  url: teamUrl(team.slug),
});

export const mapTournamentListItem = (tournament: Tournament) => ({
  beginAt: tournament.beginAt,
  endAt: tournament.endAt,
  event: tournament.event,
  id: tournament.id,
  imageUrl: tournament.imageUrl,
  league: tournament.league ? { id: tournament.league.id, name: tournament.league.name } : null,
  name: tournament.name,
  pickemsEnabled: tournament.pickemsEnabled,
  slug: tournament.slug,
  source: tournament.source,
  url: tournamentUrl(tournament),
});

export const mapLeague = (league: League) => ({
  id: league.id,
  imageUrl: league.imageUrl,
  name: league.name,
  slug: league.slug,
  source: league.pandascoreId === null ? "manual" : "pandascore",
  url: league.url,
});

/** start.gg stages stay out of MCP reads. */
export const mapEvent = ({ event, stages }: EventListing) => {
  const phases = stages
    .filter((stage) => isRedistributable(stage.source))
    .toSorted((a, b) => timeOf(a.beginAt) - timeOf(b.beginAt));

  const starts = days(phases.map((phase) => phase.beginAt));
  const ends = days(phases.map((phase) => phase.endAt));

  return {
    beginAt: starts.length ? new Date(Math.min(...starts)) : null,
    editable: !isEventSynced(event, stages),
    endAt: ends.length ? new Date(Math.max(...ends)) : null,
    id: event.id,
    league: event.league ? { id: event.league.id, name: event.league.name } : null,
    name: event.name,
    slug: event.slug,
    stages: phases.map((phase) => ({ ...mapTournamentListItem(phase), tier: phase.tier })),
    streams: redistributableStreams(event.streams),
    url: eventUrl(event.slug),
    viewership: stages.length === 0 || phases.length > 0 ? event.viewership : null,
  };
};

const mapTournamentParticipant = (participant: TournamentParticipant) => ({
  id: participant.id,
  name: participantName(participant),
  players: participant.players.map(({ id, name, slug }) => ({ id, name, slug })),
  rosterSourceUrl: participant.rosterSourceUrl,
  team: participant.team
    ? { id: participant.team.id, name: participant.team.name, slug: participant.team.slug }
    : null,
});

/** start.gg tournaments stay out of MCP responses, including write confirmations. */
export const mapListedParticipants = (
  source: DataSource,
  participants: TournamentParticipant[],
) => {
  if (!isRedistributable(source)) {
    return {};
  }

  return { participants: participants.map(mapTournamentParticipant) };
};

export const mapMatchListResponse = (match: Match) => {
  const item = mapMatchListItem(match);
  const winnerId = match.winner?.id ?? null;
  // WARNING: list queries do not populate the winner relation; participants carry the team names.
  const winner = match.participants.find((participant) => participant.id === winnerId);

  return {
    ...item,
    endAt: match.endAt,
    pandascoreId: match.pandascoreId,
    previousMatches: match.previousMatches.map((link) => ({
      previousMatchId: link.previousMatch.id,
      type: link.type,
    })),
    sourceUrl: match.sourceUrl,
    status: match.status,
    streams: redistributableStreams(match.watchStreams()),
    url: matchUrl(item.publicId, item.slug),
    viewership: isRedistributableMatch(match) ? match.viewership : null,
    winner: winner ? { name: participantName(winner), participantId: winner.id } : null,
  };
};

export const mapTournamentDetail = (tournament: Tournament) => ({
  ...mapTournamentListItem(tournament),
  description: tournament.description,
  hasBracket: tournament.hasBracket,
  sourceUrl: tournament.sourceUrl,
  tier: tournament.tier,
  winner: tournament.winner
    ? { name: participantName(tournament.winner), participantId: tournament.winner.id }
    : null,
  ...mapListedParticipants(tournament.source, tournament.participants),
  matches: tournament.matches.filter(isRedistributableMatch).map(mapMatchListResponse),
  streams: redistributableStreams(tournament.watchStreams()),
});

export const mapNewsListItem = (article: NewsArticleAdmin) => ({
  adminEditUrl: adminNewsEditUrl(article.slug),
  author: article.author,
  createdAt: article.createdAt,
  hasFrench: article.hasFrench,
  id: article.id,
  imageUrl: article.imageUrl,
  isDraft: article.isDraft,
  slug: article.slug,
  title: article.title,
  titleFr: article.titleFr,
  type: article.type,
  url: newsUrl(article.slug),
});

export const mapNewsAdminArticle = (article: NewsArticleAdmin) => ({
  ...mapNewsListItem(article),
  content: article.content,
  contentFr: article.contentFr,
});
