import { defineEntity, p } from "@mikro-orm/core";
import { Reply } from "../../../reply/infrastructure/reply-persistence";
import { User } from "../../../user/infrastructure/user-persistence";
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
  indexes: [{ properties: ["recipient", "readAt"] }, { properties: ["recipient", "createdAt"] }],
  properties: {
    createdAt: p
      .datetime()
      .type("timestamptz")
      .onCreate(() => new Date()),
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    readAt: p.datetime().type("timestamptz").nullable(),
    recipient: p.manyToOne(User),
    reply: p.manyToOne(Reply).deleteRule("cascade"),
  },
  repository: () => ReplyNotificationRepository,
});
