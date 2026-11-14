import { Collection } from "@mikro-orm/core";
import { v4 } from "uuid";
import type { Tournament } from "./tournament.entity";

export class League {
  id: string = v4();
  pandascoreId: number | null = null;
  name!: string;
  slug: string | null = null;
  url: string | null = null;
  imageUrl: string | null = null;
  modifiedAt: Date | null = null;
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
  tournaments = new Collection<Tournament>(this);
}
