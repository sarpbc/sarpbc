import { collectionItems } from "../common/serialization/collection-items";
import { Player, PlayerPhoto, Team } from "./player.entities";

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
  role: string | null;
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
  players: PlayerResponse[];
}

export function mapTeamSummary(team: Team | null | undefined): TeamSummaryResponse | null {
  if (!team?.id) {
    return null;
  }

  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    imageUrl: team.imageUrl,
    location: team.location,
  };
}

export function mapPlayer(player: Player, options?: { includePhotos?: boolean }): PlayerResponse {
  const photos = options?.includePhotos ? collectionItems<PlayerPhoto>(player.photos) : [];

  return {
    id: player.id,
    name: player.name,
    slug: player.slug,
    birthday: player.birthday,
    nationality: player.nationality,
    firstName: player.firstName,
    lastName: player.lastName,
    imageUrl: player.imageUrl,
    role: player.role,
    team: mapTeamSummary(player.team),
    ...(options?.includePhotos ? { photos: photos.map((photo) => photo.url) } : {}),
  };
}

export function mapTeam(team: Team): TeamResponse {
  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    imageUrl: team.imageUrl,
    location: team.location,
    pandascoreId: team.pandascoreId,
    players: collectionItems<Player>(team.players).map((player) => mapPlayer(player)),
  };
}
