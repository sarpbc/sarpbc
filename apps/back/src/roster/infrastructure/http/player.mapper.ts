import type {
  Player as PlayerResponse,
  TeamAlias as TeamAliasResponse,
  Team as TeamResponse,
  TeamSummary,
} from "@sarpbc/types";
import type { Player, Team } from "../../domain/roster";
import type { TeamAlias } from "../../domain/team-alias";

export function mapTeamSummary(team: Team): TeamSummary {
  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    imageUrl: team.imageUrl,
    logoLightUrl: team.logoLightUrl,
    logoDarkUrl: team.logoDarkUrl,
    location: team.location,
  };
}

export function mapPlayer(player: Player, options?: { includePhotos?: boolean }): PlayerResponse {
  const response: PlayerResponse = {
    id: player.id,
    name: player.name,
    slug: player.slug,
    birthday: player.birthday?.toISOString() ?? null,
    nationality: player.nationality,
    firstName: player.firstName,
    lastName: player.lastName,
    imageUrl: player.imageUrl,
    role: player.currentRole(),
    source: player.source,
    team: player.team ? mapTeamSummary(player.team) : null,
  };
  if (options?.includePhotos) {
    response.photos = player.photos.map((photo) => photo.url);
  }
  return response;
}

export function mapTeam(team: Team): TeamResponse {
  return {
    ...mapTeamSummary(team),
    pandascoreId: team.pandascoreId,
    source: team.source,
    players: team.players.map((player) => mapPlayer(player)),
    aliases: team.aliases.map(mapTeamAlias),
  };
}

export function mapTeamAlias(alias: TeamAlias): TeamAliasResponse {
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
