import { defineEntity, p } from "@mikro-orm/core";
import { ImageRepository } from "../images.repository";

export class Image {
  id!: string;
  imageId!: string;
  url!: string;
  createdAt: Date = new Date();
}

export const ImageSchema = defineEntity({
  class: Image,
  repository: () => ImageRepository,
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    imageId: p.string().length(255),
    url: p.string().length(500),
    createdAt: p
      .datetime()
      .type("timestamptz")
      .onCreate(() => new Date()),
  },
});
