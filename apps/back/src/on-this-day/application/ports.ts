import type { OnThisDayFact, OnThisDayFactLinkInput } from "@sarpbc/types";
import type { OnThisDayFactFields } from "../domain/on-this-day-fact";

export type StaffFact = OnThisDayFact;

export interface OnThisDayFactStore {
  list(): Promise<StaffFact[]>;
  onDay(month: number, day: number): Promise<StaffFact[]>;
  find(id: string): Promise<StaffFact | null>;
  linkExists(link: OnThisDayFactLinkInput): Promise<boolean>;
  save(id: string, fields: OnThisDayFactFields): Promise<void>;
  remove(id: string): Promise<boolean>;
}
