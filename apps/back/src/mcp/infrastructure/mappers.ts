import type { DataSource, Stream } from "@sarpbc/types";
import { isoDay, participantName } from "@sarpbc/utils";
import { isRedistributable } from "../../common/domain/data-source";
import type { Contract, Player, Team } from "../../roster/domain/roster";
import type { TeamAlias } from "../../roster/domain/team-alias";
import type {
  League,
  Match,
  Tournament,
  TournamentParticipant,
} from "../../tournament/domain/competition";
import { isEventSynced } from "../../tournament/domain/tournament-event";
import type { EventListing } from "../../tournament/application/ports";
import type { NewsArticleAdmin } from "@sarpbc/types";
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

/** start.gg teams may play in a redistributable match; only the match and tournament source count. */
export function isRedistributableMatch(match: Match): boolean {
  return isRedistributable(match.source) && isRedistributable(match.tournament.source);
}

export function redistributableStreams(streams: readonly Stream[]): Stream[] {
  return streams.filter((stream) => isRedistributable(stream.source));
}

export function mapPlayerSummary(player: Player) {
  return {
    id: player.id,
    slug: player.slug,
    name: player.name,
    nationality: player.nationality,
    status: player.status,
    role: player.currentRole(),
    source: player.source,
    team: player.team
      ? {
          id: player.team.id,
          slug: player.team.slug,
          name: player.team.name,
          source: player.team.source,
          url: teamUrl(player.team.slug),
        }
      : null,
    url: playerUrl(player.slug),
  };
}

export function mapCareer(player: Player, contracts: Contract[]) {
  return {
    player: {
      id: player.id,
      slug: player.slug,
      name: player.name,
      currentTeamId: player.team?.id ?? null,
    },
    contracts: [...contracts]
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .map((contract) => ({
        id: contract.id,
        team: { id: contract.team.id, slug: contract.team.slug, name: contract.team.name },
        startDate: isoDay(contract.startDate),
        endDate: contract.endDate ? isoDay(contract.endDate) : null,
        role: contract.role,
        joinSourceUrl: contract.joinSourceUrl,
        leaveSourceUrl: contract.leaveSourceUrl,
      })),
  };
}

export function mapTeamAlias(alias: TeamAlias) {
  return {
    id: alias.id,
    name: alias.name,
    from: alias.from,
    to: alias.to,
    sourceUrl: alias.sourceUrl,
    logoUrl: alias.logoUrl,
    pandascoreId: alias.pandascoreId,
  };
}

export function mapTeamSummary(team: Team) {
  return {
    id: team.id,
    slug: team.slug,
    name: team.name,
    location: team.location,
    active: team.active,
    source: team.source,
    logoLightUrl: team.logoLightUrl,
    logoDarkUrl: team.logoDarkUrl,
    formerNames: team.aliases.map(mapTeamAlias),
    players: team.players.map((player) => ({
      id: player.id,
      slug: player.slug,
      name: player.name,
      role: player.currentRole(),
      source: player.source,
      url: playerUrl(player.slug),
    })),
    url: teamUrl(team.slug),
  };
}

export function mapTournamentListItem(tournament: Tournament) {
  return {
    id: tournament.id,
    name: tournament.name,
    slug: tournament.slug,
    source: tournament.source,
    imageUrl: tournament.imageUrl,
    event: tournament.event,
    beginAt: tournament.beginAt,
    endAt: tournament.endAt,
    pickemsEnabled: tournament.pickemsEnabled,
    league: tournament.league ? { id: tournament.league.id, name: tournament.league.name } : null,
    url: tournamentUrl(tournament),
  };
}

export function mapLeague(league: League) {
  return {
    id: league.id,
    name: league.name,
    slug: league.slug,
    url: league.url,
    imageUrl: league.imageUrl,
    source: league.pandascoreId === null ? "manual" : "pandascore",
  };
}

/** start.gg stages stay out of MCP reads. */
export function mapEvent({ event, stages }: EventListing) {
  const phases = stages
    .filter((stage) => isRedistributable(stage.source))
    .sort((a, b) => timeOf(a.beginAt) - timeOf(b.beginAt));
  const days = (dates: Array<Date | null>) =>
    dates.filter((date): date is Date => date !== null).map((date) => date.getTime());
  const starts = days(phases.map((phase) => phase.beginAt)),
    ends = days(phases.map((phase) => phase.endAt));
  return {
    id: event.id,
    slug: event.slug,
    name: event.name,
    editable: !isEventSynced(event, stages),
    league: event.league ? { id: event.league.id, name: event.league.name } : null,
    beginAt: starts.length ? new Date(Math.min(...starts)) : null,
    endAt: ends.length ? new Date(Math.max(...ends)) : null,
    stages: phases.map((phase) => ({ ...mapTournamentListItem(phase), tier: phase.tier })),
    streams: redistributableStreams(event.streams),
    viewership: stages.length === 0 || phases.length > 0 ? event.viewership : null,
    url: eventUrl(event.slug),
  };
}

function timeOf(date: Date | null): number {
  return date?.getTime() ?? Number.POSITIVE_INFINITY;
}

export function mapTournamentParticipant(participant: TournamentParticipant) {
  return {
    id: participant.id,
    name: participantName(participant),
    team: participant.team
      ? { id: participant.team.id, slug: participant.team.slug, name: participant.team.name }
      : null,
    players: participant.players.map(({ id, name, slug }) => ({ id, name, slug })),
  };
}

/** start.gg tournaments stay out of MCP responses, including write confirmations. */
export function mapListedParticipants(source: DataSource, participants: TournamentParticipant[]) {
  if (!isRedistributable(source)) return {};
  return { participants: participants.map(mapTournamentParticipant) };
}

export function mapTournamentDetail(tournament: Tournament) {
  return {
    ...mapTournamentListItem(tournament),
    description: tournament.description,
    tier: tournament.tier,
    hasBracket: tournament.hasBracket,
    winner: tournament.winner
      ? { participantId: tournament.winner.id, name: participantName(tournament.winner) }
      : null,
    ...mapListedParticipants(tournament.source, tournament.participants),
    matches: tournament.matches.filter(isRedistributableMatch).map(mapMatchListResponse),
    streams: redistributableStreams(tournament.watchStreams()),
  };
}

export function mapMatchListResponse(match: Match) {
  const item = mapMatchListItem(match);
  const winnerId = match.winner?.id ?? null;
  // List queries do not populate the winner relation; participants carry the team names.
  const winner = match.participants.find((participant) => participant.id === winnerId);
  return {
    ...item,
    pandascoreId: match.pandascoreId,
    status: match.status,
    endAt: match.endAt,
    winner: winner ? { participantId: winner.id, name: participantName(winner) } : null,
    streams: redistributableStreams(match.watchStreams()),
    viewership: isRedistributableMatch(match) ? match.viewership : null,
    url: matchUrl(item.publicId, item.slug),
  };
}

export function mapNewsListItem(article: NewsArticleAdmin) {
  return {
    id: article.id,
    title: article.title,
    titleFr: article.titleFr,
    slug: article.slug,
    isDraft: article.isDraft,
    hasFrench: article.hasFrench,
    imageUrl: article.imageUrl,
    createdAt: article.createdAt,
    author: article.author,
    type: article.type,
    adminEditUrl: adminNewsEditUrl(article.slug),
    url: newsUrl(article.slug),
  };
}

export function mapNewsAdminArticle(article: NewsArticleAdmin) {
  return {
    ...mapNewsListItem(article),
    content: article.content,
    contentFr: article.contentFr,
  };
}
