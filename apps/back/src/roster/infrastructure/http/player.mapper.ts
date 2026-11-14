import type {
  Player as PlayerResponse,
  TeamAlias as TeamAliasResponse,
  Team as TeamResponse,
  TeamSummary,
} from "@sarpbc/types";
import type { Player } from "../../domain/player";
import type { Team } from "../../domain/team";
import type { TeamAlias } from "../../domain/team-alias";

export const mapTeamSummary = (team: Team): TeamSummary => ({
  id: team.id,
  imageUrl: team.imageUrl,
  location: team.location,
  logoDarkUrl: team.logoDarkUrl,
  logoLightUrl: team.logoLightUrl,
  name: team.name,
  slug: team.slug,
});

export const mapPlayer = (
  player: Player,
  options?: { includePhotos?: boolean },
): PlayerResponse => {
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

  return response;
};

export const mapTeamAlias = (alias: TeamAlias): TeamAliasResponse => ({
  from: alias.from,
  id: alias.id,
  logoUrl: alias.logoUrl,
  name: alias.name,
  pandascoreId: alias.pandascoreId,
  sourceUrl: alias.sourceUrl,
  to: alias.to,
});

export const mapTeam = (team: Team): TeamResponse => ({
  ...mapTeamSummary(team),
  aliases: team.aliases.map(mapTeamAlias),
  pandascoreId: team.pandascoreId,
  players: team.players.map((player) => mapPlayer(player)),
  source: team.source,
});
