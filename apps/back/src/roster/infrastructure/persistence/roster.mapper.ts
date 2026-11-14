import { isoDay, teamAliasInForce } from "@sarpbc/utils";
import * as Record from "./player.entities";
import { Player, Team, Contract, PlayerPhoto } from "../../domain/roster";
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
export function teamColumns<S extends Pick<Record.Team, TeamColumn>>(
  model: S,
): Pick<S, TeamColumn> {
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
export function playerColumns<S extends Pick<Record.Player, PlayerColumn>>(
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

export function toTeam(row: Record.Team, includePlayers = true): Team {
  const team = Object.assign(new Team(), teamColumns(row), {
    mergedIntoId: row.mergedInto?.id ?? null,
    aliases: (row.aliases ?? []).map((alias) => Object.assign(new TeamAlias(), alias)),
  });

  if (includePlayers && row.players.isInitialized())
    team.players = row.players.getItems().map((p) => toPlayer(p));

  return team;
}

export function toPlayer(row: Record.Player): Player {
  const player = Object.assign(new Player(), playerColumns(row), {
    birthday: row.birthday ? new Date(row.birthday) : null,
    contractRole: row.contractRole,
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

export function teamNameAt(row: Pick<Record.Team, "name" | "aliases">, at: Date | null): string {
  if (!at) return row.name;

  return teamAliasInForce(row.aliases ?? [], isoDay(new Date(at)))?.name ?? row.name;
}
