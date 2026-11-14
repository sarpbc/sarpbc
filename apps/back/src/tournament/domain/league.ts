import { v4 } from "uuid";

export class League {
  id = v4();
  pandascoreId: number | null = null;
  name = "";
  slug: string | null = null;
  url: string | null = null;
  imageUrl: string | null = null;
  modifiedAt: Date | null = null;
  createdAt = new Date();
  updatedAt = new Date();
}
