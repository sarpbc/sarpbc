import { defineEntity, p } from "@mikro-orm/core";
import { Reply } from "../forum/forum.entities";
import { User } from "../user/domain/user.entity";
import { ReplyNotificationRepository } from "./reply-notification.repository";

export class ReplyNotification {
  id!: string;
  recipient!: User;
  reply!: Reply;
  readAt: Date | null = null;
  createdAt: Date = new Date();
}

export const ReplyNotificationSchema = defineEntity({
  class: ReplyNotification,
  repository: () => ReplyNotificationRepository,
  indexes: [{ properties: ["recipient", "readAt"] }, { properties: ["recipient", "createdAt"] }],
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    recipient: p.manyToOne(User),
    reply: p.manyToOne(Reply).deleteRule("cascade"),
    readAt: p.datetime().type("timestamptz").nullable(),
    createdAt: p
      .datetime()
      .type("timestamptz")
      .onCreate(() => new Date()),
  },
});
