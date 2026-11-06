import * as Record from "./player.entities";
import { Player, Team, Contract, PlayerPhoto } from "../../domain/roster";

const TEAM_COLUMNS = [
  "id",
  "name",
  "slug",
  "pandascoreId",
  "active",
  "source",
  "location",
  "imageUrl",
  "darkModeImageUrl",
  "logoLightUrl",
  "logoDarkUrl",
] as const satisfies readonly (keyof Team & keyof Record.Team)[];

const PLAYER_COLUMNS = [
  "id",
  "name",
  "slug",
  "pandascoreId",
  "birthday",
  "nationality",
  "firstName",
  "lastName",
  "imageUrl",
  "role",
  "status",
  "source",
] as const satisfies readonly (keyof Player & keyof Record.Player)[];

function pick<T, K extends keyof T>(source: T, keys: readonly K[]): Pick<T, K> {
  return Object.fromEntries(keys.map((key) => [key, source[key]])) as Pick<T, K>;
}

/** The scalar columns a team row stores; the merge redirect is a relation the store sets itself. */
export const teamColumns = (model: Team) => pick(model, TEAM_COLUMNS);

/** `contractRole` is a read-only formula column and is never written. */
export const playerColumns = (model: Player) => pick(model, PLAYER_COLUMNS);

export function toTeam(row: Record.Team, includePlayers = true): Team {
  const team = Object.assign(new Team(), pick(row, TEAM_COLUMNS), {
    mergedIntoId: row.mergedInto?.id ?? null,
  });
  if (includePlayers && row.players.isInitialized())
    team.players = row.players.getItems().map((p) => toPlayer(p));
  return team;
}
export function toPlayer(row: Record.Player): Player {
  const player = Object.assign(new Player(), pick(row, PLAYER_COLUMNS), {
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
