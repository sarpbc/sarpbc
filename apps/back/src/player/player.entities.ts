import { Collection, defineEntity, p } from "@mikro-orm/core";
import { TeamRepository } from "../team/team.repository";
import { ContractRepository } from "./contract.repository";
import { PlayerPhotoRepository } from "./player-photo.repository";
import { PlayerRepository } from "./player.repository";

export enum ContractRole {
  ACTIVE = "active",
  BENCHED = "benched",
  LOANED = "loaned",
}

export enum PlayerAwardType {
  MVP = "mvp",
}

export class Team {
  id!: string;
  name!: string;
  players = new Collection<Player>(this);
  location: string | null = null;
  imageUrl: string | null = null;
  slug!: string;
  pandascoreId: number | null = null;
}

export class Player {
  id!: string;
  name!: string;
  team: Team | null = null;
  birthday: Date | null = null;
  nationality: string | null = null;
  firstName: string | null = null;
  lastName: string | null = null;
  imageUrl: string | null = null;
  /** PandaScore role (e.g. "Coach"); null for standard roster players. */
  role: string | null = null;
  slug!: string;
  contracts = new Collection<Contract>(this);
  photos = new Collection<PlayerPhoto>(this);
}

export class Contract {
  id!: string;
  player!: Player;
  team!: Team;
  startDate!: Date;
  endDate: Date | null = null;
  role: ContractRole = ContractRole.ACTIVE;
  createdAt = new Date();
}

export class PlayerPhoto {
  id!: string;
  player!: Player;
  url!: string;
  createdAt = new Date();
}

export const TeamSchema = defineEntity({
  class: Team,
  repository: () => TeamRepository,
  indexes: [{ properties: ["name"] }, { properties: ["slug"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    name: p.string(),
    players: p.oneToMany(Player).mappedBy("team"),
    location: p.string().nullable(),
    imageUrl: p.string().nullable(),
    slug: p.string(),
    pandascoreId: p.integer().nullable(),
  },
});

export const PlayerSchema = defineEntity({
  class: Player,
  repository: () => PlayerRepository,
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
    slug: p.string(),
    contracts: p.oneToMany(Contract).mappedBy("player"),
    photos: p.oneToMany(PlayerPhoto).mappedBy("player"),
  },
});

export const ContractSchema = defineEntity({
  class: Contract,
  repository: () => ContractRepository,
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    player: p.manyToOne(Player),
    team: p.manyToOne(Team),
    startDate: p.datetime().type("date"),
    endDate: p.datetime().type("date").nullable(),
    role: p
      .enum(() => ContractRole)
      .columnType("text")
      .default(ContractRole.ACTIVE),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
  },
});

export const PlayerPhotoSchema = defineEntity({
  class: PlayerPhoto,
  repository: () => PlayerPhotoRepository,
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    player: p.manyToOne(Player),
    url: p.string(),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
  },
});
