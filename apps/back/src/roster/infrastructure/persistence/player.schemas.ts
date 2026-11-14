import { defineEntity, p } from "@mikro-orm/core";
import { CONTRACT_ROLES, PLAYER_STATUSES } from "@sarpbc/types";
import type { DataSource, TeamAlias as TeamAliasRecord } from "@sarpbc/types";
import { Team } from "./team.entity";
import { TeamAlias } from "./team-alias.entity";
import { Player } from "./player.entity";
import { Contract } from "./contract.entity";
import { PlayerPhoto } from "./player-photo.entity";

export const TeamSchema = defineEntity({
  class: Team,
  indexes: [{ properties: ["name"] }, { properties: ["slug"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    name: p.string(),
    players: p.oneToMany(Player).mappedBy("team"),
    active: p.boolean().default(true),
    location: p.string().nullable(),
    imageUrl: p.string().nullable(),
    darkModeImageUrl: p.string().nullable(),
    logoLightUrl: p.text().nullable(),
    logoDarkUrl: p.text().nullable(),
    slug: p.string(),
    pandascoreId: p.integer().nullable(),
    source: p.string().$type<DataSource>().default("manual"),
    mergedInto: p.manyToOne(Team).nullable().deleteRule("restrict"),
    aliases: p
      .json<TeamAliasRecord[]>()
      .formula(
        (columns) =>
          `(select coalesce(json_agg(json_build_object('id', ta."id", 'name', ta."name", 'from', ta."valid_from", 'to', ta."valid_to", 'sourceUrl', ta."source_url", 'logoUrl', ta."logo_url", 'pandascoreId', ta."pandascore_id") order by ta."valid_from"), '[]'::json) from "team_alias" ta where ta."team_id" = ${columns.id})`,
      ),
  },
});

export const TeamAliasSchema = defineEntity({
  class: TeamAlias,
  indexes: [{ properties: ["team"] }, { properties: ["name"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    team: p.manyToOne(Team).deleteRule("cascade"),
    name: p.string(),
    validFrom: p.date(),
    validTo: p.date().nullable(),
    sourceUrl: p.text(),
    logoUrl: p.text().nullable(),
    pandascoreId: p.integer().nullable().unique(),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
  },
});

export const PlayerSchema = defineEntity({
  class: Player,
  indexes: [{ properties: ["name"] }, { properties: ["slug"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    name: p.string(),
    team: p.manyToOne(Team).nullable(),
    birthday: p.datetime().type("date").nullable(),
    nationality: p.string().nullable(),
    firstName: p.string().nullable(),
    lastName: p.string().nullable(),
    imageUrl: p.string().nullable(),
    role: p.string().nullable(),
    contractRole: p
      .enum([...CONTRACT_ROLES])
      .nullable()
      .formula(
        (columns) =>
          `(select c."role" from "contract" c where c."player_id" = ${columns.id} and c."team_id" = ${columns.team} and c."end_date" is null order by c."start_date" desc limit 1)`,
      ),
    status: p
      .enum([...PLAYER_STATUSES])
      .columnType("text")
      .default("active"),
    slug: p.string(),
    pandascoreId: p.integer().nullable().unique(),
    source: p.string().$type<DataSource>().default("manual"),
    mergedInto: p.manyToOne(Player).nullable().deleteRule("restrict"),
    contracts: p.oneToMany(Contract).mappedBy("player"),
    photos: p.oneToMany(PlayerPhoto).mappedBy("player"),
  },
});

export const ContractSchema = defineEntity({
  class: Contract,
  indexes: [
    {
      name: "contract_open_player_team_idx",
      properties: ["player", "team"],
      where: { endDate: null },
    },
  ],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    player: p.manyToOne(Player),
    team: p.manyToOne(Team),
    startDate: p.datetime().type("date"),
    endDate: p.datetime().type("date").nullable(),
    role: p
      .enum([...CONTRACT_ROLES])
      .columnType("text")
      .default("active"),
    joinSourceUrl: p.text().nullable(),
    leaveSourceUrl: p.text().nullable(),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
  },
});

export const PlayerPhotoSchema = defineEntity({
  class: PlayerPhoto,
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    player: p.manyToOne(Player),
    url: p.string(),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
  },
});
