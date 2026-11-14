import { defineEntity, p } from "@mikro-orm/core";
import { User } from "../../../user/infrastructure/user-persistence";

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
  properties: {
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    lastUsedAt: p.datetime().type("timestamptz").nullable(),
    name: p.string(),
    owner: p.manyToOne(User),
    revokedAt: p.datetime().type("timestamptz").nullable(),
    tokenHash: p.string().hidden(),
  },
  uniques: [{ properties: ["tokenHash"] }],
});
