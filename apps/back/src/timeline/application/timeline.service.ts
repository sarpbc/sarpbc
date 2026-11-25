import type { StaffTimelineEntry, TimelineEntry, TimelineEntryInput } from "@sarpbc/types";
import { v4 } from "uuid";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { parseTimelineEntry } from "../domain/timeline-entry";
import type { TimelineStore } from "./ports";

export class TimelineService {
  constructor(private readonly store: TimelineStore) {}

  async list() {
    return (await this.store.list()) satisfies StaffTimelineEntry[];
  }

  async publicEntries() {
    const entries = await this.store.list();

    return entries.map(({ id: _id, ...entry }) => entry) satisfies TimelineEntry[];
  }

  async create(input: TimelineEntryInput) {
    return (await this.write(v4(), input)) satisfies StaffTimelineEntry;
  }

  async update(id: string, changes: Partial<TimelineEntryInput>) {
    const current = await this.require(id);

    return (await this.write(id, { ...current, ...changes })) satisfies StaffTimelineEntry;
  }

  async remove(id: string) {
    if (!(await this.store.remove(id))) {
      throw new NotFoundError("Timeline entry not found");
    }
  }

  private async write(id: string, input: TimelineEntryInput) {
    await this.store.save(id, parseTimelineEntry(input));

    return (await this.require(id)) satisfies StaffTimelineEntry;
  }

  private async require(id: string) {
    const entry = await this.store.find(id);

    if (!entry) {
      throw new NotFoundError("Timeline entry not found");
    }

    return entry satisfies StaffTimelineEntry;
  }
}
