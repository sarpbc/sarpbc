import type { Player, Team } from "../../player/domain/roster";
import type { Match, Tournament } from "../../tournament/domain/competition";
import type { NewsArticleAdminResponse } from "../../news/application/news.service";
import { mapMatchListItem } from "../../tournament/infrastructure/http/match-list.mapper";
import { adminNewsEditUrl, matchUrl, newsUrl, playerUrl, teamUrl, tournamentUrl } from "./urls";

export function mapPlayerSummary(player: Player) {
  return {
    id: player.id,
    slug: player.slug,
    name: player.name,
    nationality: player.nationality,
    team: player.team
      ? {
          id: player.team.id,
          slug: player.team.slug,
          name: player.team.name,
          url: teamUrl(player.team.slug),
        }
      : null,
    url: playerUrl(player.slug),
  };
}

export function mapTeamSummary(team: Team, players?: Player[]) {
  const roster = players ?? team.players;

  return {
    id: team.id,
    slug: team.slug,
    name: team.name,
    location: team.location,
    players: roster.map((player) => ({
      id: player.id,
      slug: player.slug,
      name: player.name,
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
  const matches = tournament.matches.map(mapMatchListItem);

  return {
    ...mapTournamentListItem(tournament),
    description: tournament.description,
    tier: tournament.tier,
    hasBracket: tournament.hasBracket,
    matches: matches.map((match) => ({
      ...match,
      url: matchUrl(match.publicId, match.slug),
    })),
  };
}

export function mapMatchListResponse(match: Match) {
  const item = mapMatchListItem(match);
  return { ...item, url: matchUrl(item.publicId, item.slug) };
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
