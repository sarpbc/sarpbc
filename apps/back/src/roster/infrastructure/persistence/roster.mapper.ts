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
export function teamColumns<S extends Pick<TeamRow, TeamColumn>>(model: S): Pick<S, TeamColumn> {
  return {
    id: model.id,
    name: model.name,
    slug: model.slug,
    pandascoreId: model.pandascoreId,
    active: model.active,
    source: model.source,
    location: model.location,
    imageUrl: model.imageUrl,
    darkModeImageUrl: model.darkModeImageUrl,
    logoLightUrl: model.logoLightUrl,
    logoDarkUrl: model.logoDarkUrl,
  };
}

/** `contractRole` is a read-only formula column and is never written. */
export function playerColumns<S extends Pick<PlayerRow, PlayerColumn>>(
  model: S,
): Pick<S, PlayerColumn> {
  return {
    id: model.id,
    name: model.name,
    slug: model.slug,
    pandascoreId: model.pandascoreId,
    birthday: model.birthday,
    nationality: model.nationality,
    firstName: model.firstName,
    lastName: model.lastName,
    imageUrl: model.imageUrl,
    role: model.role,
    status: model.status,
    source: model.source,
  };
}

export function toPhoto(row: PlayerPhotoRow): PlayerPhoto {
  return Object.assign(new PlayerPhoto(), {
    id: row.id,
    player: Object.assign(new Player(), { id: row.player.id }),
    url: row.url,
    createdAt: new Date(row.createdAt),
  });
}

function toBareTeam(row: TeamRow): Team {
  return Object.assign(new Team(), teamColumns(row), {
    mergedIntoId: row.mergedInto?.id ?? null,
    aliases: (row.aliases ?? []).map((alias) => Object.assign(new TeamAlias(), alias)),
  });
}

export function toPlayer(row: PlayerRow): Player {
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
}

export function toTeam(row: TeamRow, includePlayers = true): Team {
  const team = toBareTeam(row);

  if (includePlayers && row.players.isInitialized()) {
    team.players = row.players.getItems().map((p) => toPlayer(p));
  }

  return team;
}

export function toContract(row: ContractRow): Contract {
  return Object.assign(new Contract(), {
    id: row.id,
    player: toPlayer(row.player),
    team: toBareTeam(row.team),
    startDate: new Date(row.startDate),
    endDate: row.endDate ? new Date(row.endDate) : null,
    role: row.role,
    joinSourceUrl: row.joinSourceUrl,
    leaveSourceUrl: row.leaveSourceUrl,
    createdAt: new Date(row.createdAt),
  });
}

export function teamNameAt(row: Pick<TeamRow, "name" | "aliases">, at: Date | null): string {
  if (!at) {
    return row.name;
  }

  return teamAliasInForce(row.aliases ?? [], isoDay(new Date(at)))?.name ?? row.name;
}
