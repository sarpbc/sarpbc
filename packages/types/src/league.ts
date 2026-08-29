/** `tournaments` is loosely typed so apps can refine with local Tournament shapes. */
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
  tournaments?: unknown[];
}
