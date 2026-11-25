import { EntityManager } from "@mikro-orm/postgresql";
import type { TimelineEntryInput } from "@sarpbc/types";
import type { TimelineStore } from "../../application/ports";
import { TimelineEntry } from "./timeline-entry.entities";

const toEntry = (row: TimelineEntry) => ({
  date: row.date,
  id: row.id,
  kind: row.kind,
  nameEn: row.nameEn,
  nameFr: row.nameFr,
  noteEn: row.noteEn,
  noteFr: row.noteFr,
  sourceUrl: row.sourceUrl,
});

export class TimelinePersistence implements TimelineStore {
  constructor(private readonly em: EntityManager) {}

  async list() {
    const rows = await this.em.find(
      TimelineEntry,
      {},
      { orderBy: [{ date: "ASC" }, { createdAt: "ASC" }] },
    );

    return rows.map(toEntry);
  }

  async find(id: string) {
    const row = await this.em.findOne(TimelineEntry, { id });

    return row ? toEntry(row) : null;
  }

  async save(id: string, fields: TimelineEntryInput) {
    const row = (await this.em.findOne(TimelineEntry, { id })) ?? new TimelineEntry();
    Object.assign(row, { id, ...fields });
    await this.em.persist(row).flush();
  }

  async remove(id: string) {
    return (await this.em.nativeDelete(TimelineEntry, { id })) > 0;
  }
}
