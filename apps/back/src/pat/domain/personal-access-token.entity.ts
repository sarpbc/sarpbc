import { defineEntity, p } from "@mikro-orm/core";
import { User } from "../../user/domain/user.entity";

export class PersonalAccessToken {
  id!: string;
  owner!: User;
  name!: string;
  tokenHash!: string;
  createdAt = new Date();
  lastUsedAt: Date | null = null;
  revokedAt: Date | null = null;
}

export const PersonalAccessTokenSchema = defineEntity({
  class: PersonalAccessToken,
  indexes: [{ properties: ["owner"] }],
  uniques: [{ properties: ["tokenHash"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    owner: p.manyToOne(User),
    name: p.string(),
    tokenHash: p.string().hidden(),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    lastUsedAt: p.datetime().type("timestamptz").nullable(),
    revokedAt: p.datetime().type("timestamptz").nullable(),
  },
});
