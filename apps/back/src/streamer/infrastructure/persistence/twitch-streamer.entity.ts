import { defineEntity, p } from "@mikro-orm/core";

export class TwitchStreamer {
  id!: string;
  login!: string;
  displayName: string | null = null;
  createdAt = new Date();
}

export const TwitchStreamerSchema = defineEntity({
  class: TwitchStreamer,
  uniques: [{ properties: ["login"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    login: p.string(),
    displayName: p.string().nullable(),
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
  },
});
