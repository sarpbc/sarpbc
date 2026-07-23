import type { Tournament } from "./tournament";

export interface League {
  id: string;
  pandascoreId: number;
  name: string;
  slug?: string;
  url?: string;
  imageUrl?: string;
  modifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  tournaments?: Tournament[];
}
