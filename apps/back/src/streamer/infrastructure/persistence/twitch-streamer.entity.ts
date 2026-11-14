import { defineEntity, p } from "@mikro-orm/core";

export class TwitchStreamer {
  id!: string;
  login!: string;
  displayName: string | null = null;
  createdAt = new Date();
}

export const TwitchStreamerSchema = defineEntity({
  class: TwitchStreamer,
  properties: {
    createdAt: p.datetime().type("timestamptz").defaultRaw("now()"),
    displayName: p.string().nullable(),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    login: p.string(),
  },
  uniques: [{ properties: ["login"] }],
});
