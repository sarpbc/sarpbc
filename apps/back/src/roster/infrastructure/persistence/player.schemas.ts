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
    active: p.boolean().default(true),
    aliases: p
      .json<TeamAliasRecord[]>()
      .formula(
        (columns) =>
          `(select coalesce(json_agg(json_build_object('id', ta."id", 'name', ta."name", 'from', ta."valid_from", 'to', ta."valid_to", 'sourceUrl', ta."source_url", 'logoUrl', ta."logo_url", 'pandascoreId', ta."pandascore_id") order by ta."valid_from"), '[]'::json) from "team_alias" ta where ta."team_id" = ${columns.id})`,
      ),
    darkModeImageUrl: p.string().nullable(),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    imageUrl: p.string().nullable(),
    location: p.string().nullable(),
    logoDarkUrl: p.text().nullable(),
    logoLightUrl: p.text().nullable(),
    mergedInto: p.manyToOne(Team).nullable().deleteRule("restrict"),
    name: p.string(),
    national: p.boolean().default(false),
    pandascoreId: p.integer().nullable(),
    players: p.oneToMany(Player).mappedBy("team"),
    slug: p.string(),
    source: p.string().$type<DataSource>().default("manual"),
  },
});

export const TeamAliasSchema = defineEntity({
  class: TeamAlias,
  indexes: [{ properties: ["team"] }, { properties: ["name"] }],
  properties: {
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    logoUrl: p.text().nullable(),
    name: p.string(),
    pandascoreId: p.integer().nullable().unique(),
    sourceUrl: p.text(),
    team: p.manyToOne(Team).deleteRule("cascade"),
    validFrom: p.date(),
    validTo: p.date().nullable(),
  },
});

export const PlayerSchema = defineEntity({
  class: Player,
  indexes: [{ properties: ["name"] }, { properties: ["slug"] }],
  properties: {
    birthday: p.datetime().type("date").nullable(),
    contractRole: p
      .enum([...CONTRACT_ROLES])
      .nullable()
      .formula(
        (columns) =>
          `(select c."role" from "contract" c where c."player_id" = ${columns.id} and c."team_id" = ${columns.team} and c."end_date" is null order by c."start_date" desc limit 1)`,
      ),
    contracts: p.oneToMany(Contract).mappedBy("player"),
    firstName: p.string().nullable(),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    imageUrl: p.string().nullable(),
    lastName: p.string().nullable(),
    mergedInto: p.manyToOne(Player).nullable().deleteRule("restrict"),
    name: p.string(),
    nationality: p.string().nullable(),
    pandascoreId: p.integer().nullable().unique(),
    photos: p.oneToMany(PlayerPhoto).mappedBy("player"),
    role: p.string().nullable(),
    slug: p.string(),
    source: p.string().$type<DataSource>().default("manual"),
    status: p
      .enum([...PLAYER_STATUSES])
      .columnType("text")
      .default("active"),
    team: p.manyToOne(Team).nullable(),
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
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    endDate: p.datetime().type("date").nullable(),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    joinSourceUrl: p.text().nullable(),
    leaveSourceUrl: p.text().nullable(),
    player: p.manyToOne(Player),
    role: p
      .enum([...CONTRACT_ROLES])
      .columnType("text")
      .default("active"),
    startDate: p.datetime().type("date"),
    team: p.manyToOne(Team),
  },
});

export const PlayerPhotoSchema = defineEntity({
  class: PlayerPhoto,
  properties: {
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    player: p.manyToOne(Player),
    url: p.string(),
  },
});
