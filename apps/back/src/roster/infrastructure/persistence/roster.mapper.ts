import * as Record from "./player.entities";
import { Player, Team, Contract, PlayerPhoto } from "../../domain/roster";
export function toTeam(row: Record.Team, includePlayers = true): Team {
  const team = Object.assign(new Team(), {
    id: row.id,
    name: row.name,
    active: row.active,
    location: row.location,
    imageUrl: row.imageUrl,
    darkModeImageUrl: row.darkModeImageUrl,
    logoLightUrl: row.logoLightUrl,
    logoDarkUrl: row.logoDarkUrl,
    slug: row.slug,
    pandascoreId: row.pandascoreId,
    source: row.source,
    mergedIntoId: row.mergedInto?.id ?? null,
  });
  if (includePlayers && row.players.isInitialized())
    team.players = row.players.getItems().map((p) => toPlayer(p));
  return team;
}
export function toPlayer(row: Record.Player): Player {
  const player = Object.assign(new Player(), {
    id: row.id,
    name: row.name,
    birthday: row.birthday ? new Date(row.birthday) : null,
    nationality: row.nationality,
    firstName: row.firstName,
    lastName: row.lastName,
    imageUrl: row.imageUrl,
    role: row.role,
    status: row.status,
    slug: row.slug,
    pandascoreId: row.pandascoreId,
    source: row.source,
    mergedIntoId: row.mergedInto?.id ?? null,
    team: row.team ? toTeam(row.team, false) : null,
  });
  if (row.photos.isInitialized()) player.photos = row.photos.getItems().map((p) => toPhoto(p));
  return player;
}
export function toContract(row: Record.Contract): Contract {
  return Object.assign(new Contract(), {
    id: row.id,
    player: toPlayer(row.player),
    team: toTeam(row.team, false),
    startDate: new Date(row.startDate),
    endDate: row.endDate ? new Date(row.endDate) : null,
    role: row.role,
    joinSourceUrl: row.joinSourceUrl,
    leaveSourceUrl: row.leaveSourceUrl,
    createdAt: new Date(row.createdAt),
  });
}
export function toPhoto(row: Record.PlayerPhoto): PlayerPhoto {
  return Object.assign(new PlayerPhoto(), {
    id: row.id,
    player: Object.assign(new Player(), { id: row.player.id }),
    url: row.url,
    createdAt: new Date(row.createdAt),
  });
}
