import type { DataSource } from "../../../common/domain/data-source";
import { ContractRole, Player, Team } from "../../domain/roster";

export interface TeamSummaryResponse {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  location: string | null;
}

export interface PlayerResponse {
  id: string;
  name: string;
  slug: string;
  birthday: Date | null;
  nationality: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  role: ContractRole | null;
  source: DataSource;
  team: TeamSummaryResponse | null;
  photos?: string[];
}

export interface TeamResponse {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  location: string | null;
  pandascoreId: number | null;
  source: DataSource;
  players: PlayerResponse[];
}

export function mapTeamSummary(team: Team): TeamSummaryResponse {
  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    imageUrl: team.imageUrl,
    location: team.location,
  };
}

export function mapPlayer(player: Player, options?: { includePhotos?: boolean }): PlayerResponse {
  const photos = options?.includePhotos ? player.photos : [];

  const response: PlayerResponse = {
    id: player.id,
    name: player.name,
    slug: player.slug,
    birthday: player.birthday,
    nationality: player.nationality,
    firstName: player.firstName,
    lastName: player.lastName,
    imageUrl: player.imageUrl,
    role: player.currentRole(),
    source: player.source,
    team: player.team ? mapTeamSummary(player.team) : null,
  };
  if (options?.includePhotos) {
    response.photos = photos.map((photo) => photo.url);
  }
  return response;
}

export function mapTeam(team: Team): TeamResponse {
  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    imageUrl: team.imageUrl,
    location: team.location,
    pandascoreId: team.pandascoreId,
    source: team.source,
    players: team.players.map((player) => mapPlayer(player)),
  };
}
