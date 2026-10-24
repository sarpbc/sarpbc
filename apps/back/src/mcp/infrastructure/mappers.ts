import { isRedistributable } from "../../common/domain/data-source";
import type { Contract, Player, Team } from "../../player/domain/roster";
import type { Match, Tournament } from "../../tournament/domain/competition";
import type { NewsArticleAdminResponse } from "../../news/application/news.service";
import { mapMatchListItem } from "../../tournament/infrastructure/http/match-list.mapper";
import { adminNewsEditUrl, matchUrl, newsUrl, playerUrl, teamUrl, tournamentUrl } from "./urls";

/** start.gg teams may play in a redistributable match; only the match and tournament source count. */
export function isRedistributableMatch(match: Match): boolean {
  return isRedistributable(match.source) && isRedistributable(match.tournament.source);
}

export function mapPlayerSummary(player: Player) {
  return {
    id: player.id,
    slug: player.slug,
    name: player.name,
    nationality: player.nationality,
    status: player.status,
    role: player.role,
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

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function mapTeamSummary(team: Team, players?: Player[]) {
  const roster = players ?? team.players;

  return {
    id: team.id,
    slug: team.slug,
    name: team.name,
    location: team.location,
    active: team.active,
    source: team.source,
    players: roster.map((player) => ({
      id: player.id,
      slug: player.slug,
      name: player.name,
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

export function mapTournamentDetail(tournament: Tournament) {
  return {
    ...mapTournamentListItem(tournament),
    description: tournament.description,
    tier: tournament.tier,
    hasBracket: tournament.hasBracket,
    winner: tournament.winner
      ? { participantId: tournament.winner.id, teamName: tournament.winner.team.name }
      : null,
    matches: tournament.matches.filter(isRedistributableMatch).map(mapMatchListResponse),
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
    winner: winner ? { participantId: winner.id, teamName: winner.team.name } : null,
    url: matchUrl(item.publicId, item.slug),
  };
}

export function mapNewsListItem(article: NewsArticleAdminResponse) {
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

export function mapNewsAdminArticle(article: NewsArticleAdminResponse) {
  return {
    ...mapNewsListItem(article),
    content: article.content,
    contentFr: article.contentFr,
  };
}
