import { isoDay, teamAliasInForce } from "@sarpbc/utils";
import type { Team as TeamRow } from "./team.entity";
import type { Player as PlayerRow } from "./player.entity";
import type { Contract as ContractRow } from "./contract.entity";
import type { PlayerPhoto as PlayerPhotoRow } from "./player-photo.entity";
import { Player } from "../../domain/player";
import { Team } from "../../domain/team";
import { Contract } from "../../domain/contract";
import { PlayerPhoto } from "../../domain/player-photo";
import { TeamAlias } from "../../domain/team-alias";

type TeamColumn =
  | "id"
  | "name"
  | "slug"
  | "pandascoreId"
  | "active"
  | "source"
  | "location"
  | "imageUrl"
  | "darkModeImageUrl"
  | "logoLightUrl"
  | "logoDarkUrl";

type PlayerColumn =
  | "id"
  | "name"
  | "slug"
  | "pandascoreId"
  | "birthday"
  | "nationality"
  | "firstName"
  | "lastName"
  | "imageUrl"
  | "role"
  | "status"
  | "source";

/** The scalar columns a team row stores; the merge redirect is a relation the store sets itself. */
export const teamColumns = <S extends Pick<TeamRow, TeamColumn>>(
  model: S,
): Pick<S, TeamColumn> => ({
  active: model.active,
  darkModeImageUrl: model.darkModeImageUrl,
  id: model.id,
  imageUrl: model.imageUrl,
  location: model.location,
  logoDarkUrl: model.logoDarkUrl,
  logoLightUrl: model.logoLightUrl,
  name: model.name,
  pandascoreId: model.pandascoreId,
  slug: model.slug,
  source: model.source,
});

/** `contractRole` is a read-only formula column and is never written. */
export const playerColumns = <S extends Pick<PlayerRow, PlayerColumn>>(
  model: S,
): Pick<S, PlayerColumn> => ({
  birthday: model.birthday,
  firstName: model.firstName,
  id: model.id,
  imageUrl: model.imageUrl,
  lastName: model.lastName,
  name: model.name,
  nationality: model.nationality,
  pandascoreId: model.pandascoreId,
  role: model.role,
  slug: model.slug,
  source: model.source,
  status: model.status,
});

export const toPhoto = (row: PlayerPhotoRow): PlayerPhoto =>
  Object.assign(new PlayerPhoto(), {
    createdAt: new Date(row.createdAt),
    id: row.id,
    player: Object.assign(new Player(), { id: row.player.id }),
    url: row.url,
  });

const toBareTeam = (row: TeamRow): Team =>
  Object.assign(new Team(), teamColumns(row), {
    aliases: (row.aliases ?? []).map((alias) => Object.assign(new TeamAlias(), alias)),
    mergedIntoId: row.mergedInto?.id ?? null,
  });

export const toPlayer = (row: PlayerRow): Player => {
  const player = Object.assign(new Player(), playerColumns(row), {
    birthday: row.birthday ? new Date(row.birthday) : null,
    contractRole: row.contractRole,
    mergedIntoId: row.mergedInto?.id ?? null,
    team: row.team ? toBareTeam(row.team) : null,
  });

  if (row.photos.isInitialized()) {
    player.photos = row.photos.getItems().map((p) => toPhoto(p));
  }

  return player;
};

export const toTeam = (row: TeamRow, includePlayers = true): Team => {
  const team = toBareTeam(row);

  if (includePlayers && row.players.isInitialized()) {
    team.players = row.players.getItems().map((p) => toPlayer(p));
  }

  return team;
};

export const toContract = (row: ContractRow): Contract =>
  Object.assign(new Contract(), {
    createdAt: new Date(row.createdAt),
    endDate: row.endDate ? new Date(row.endDate) : null,
    id: row.id,
    joinSourceUrl: row.joinSourceUrl,
    leaveSourceUrl: row.leaveSourceUrl,
    player: toPlayer(row.player),
    role: row.role,
    startDate: new Date(row.startDate),
    team: toBareTeam(row.team),
  });

export const teamNameAt = (row: Pick<TeamRow, "name" | "aliases">, at: Date | null): string => {
  if (!at) {
    return row.name;
  }

  return teamAliasInForce(row.aliases ?? [], isoDay(new Date(at)))?.name ?? row.name;
};
