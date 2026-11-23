import type {
  Player as PlayerResponse,
  Team as TeamResponse,
  TeamAlias as TeamAliasResponse,
  TeamSummary,
} from "@sarpbc/types";
import type { Player } from "../../domain/player";
import type { Team } from "../../domain/team";
import type { TeamAlias } from "../../domain/team-alias";

export const mapTeamSummary = (team: Team) =>
  ({
    id: team.id,
    imageUrl: team.imageUrl,
    location: team.location,
    logoDarkUrl: team.logoDarkUrl,
    logoLightUrl: team.logoLightUrl,
    name: team.name,
    slug: team.slug,
  }) satisfies TeamSummary;

export const mapPlayer = (player: Player, options?: { includePhotos?: boolean }) => {
  const response: PlayerResponse = {
    birthday: player.birthday?.toISOString() ?? null,
    firstName: player.firstName,
    id: player.id,
    imageUrl: player.imageUrl,
    lastName: player.lastName,
    name: player.name,
    nationality: player.nationality,
    role: player.currentRole(),
    slug: player.slug,
    source: player.source,
    team: player.team ? mapTeamSummary(player.team) : null,
  };

  if (options?.includePhotos === true) {
    response.photos = player.photos.map((photo) => photo.url);
  }

  return response satisfies PlayerResponse;
};

export const mapTeamAlias = (alias: TeamAlias) =>
  ({
    from: alias.from,
    id: alias.id,
    logoUrl: alias.logoUrl,
    name: alias.name,
    pandascoreId: alias.pandascoreId,
    sourceUrl: alias.sourceUrl,
    to: alias.to,
  }) satisfies TeamAliasResponse;

export const mapTeam = (team: Team) =>
  ({
    ...mapTeamSummary(team),
    aliases: team.aliases.map(mapTeamAlias),
    national: team.national,
    pandascoreId: team.pandascoreId,
    players: team.players.map((player) => mapPlayer(player)),
    source: team.source,
  }) satisfies TeamResponse;
