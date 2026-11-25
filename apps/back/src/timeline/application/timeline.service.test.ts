import type { StaffTimelineEntry, TimelineEntryInput } from "@sarpbc/types";
import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import type { TimelineStore } from "./ports";
import { TimelineService } from "./timeline.service";

const UNKNOWN_ID = "0b6e3d8a-1f2c-4e5d-8a9b-7c6d5e4f3a2b";

const input: TimelineEntryInput = {
  date: "2023-09-06",
  kind: "patch",
  nameEn: "Season 8 begins",
  nameFr: "Début de la saison 8",
  noteEn: "Ranked rewards are reset.",
  noteFr: "Les récompenses classées sont réinitialisées.",
  sourceUrl: "https://www.rocketleague.com/news",
};

const memoryStore = () => {
  const rows = new Map<string, StaffTimelineEntry>();

  return {
    find: async (id) => rows.get(id) ?? null,
    list: async () => [...rows.values()],
    remove: async (id) => rows.delete(id),
    save: async (id, fields) => {
      rows.set(id, { id, ...fields });
    },
  } satisfies TimelineStore;
};

describe(TimelineService, () => {
  it("creates, edits and deletes a timeline entry", async () => {
    const service = new TimelineService(memoryStore());

    const created = await service.create(input);
    expect(created).toMatchObject({ date: "2023-09-06", kind: "patch", nameEn: "Season 8 begins" });

    const updated = await service.update(created.id, { ...input, kind: "format" });
    expect(updated).toMatchObject({ id: created.id, kind: "format" });
    await expect(service.list()).resolves.toHaveLength(1);

    await service.remove(created.id);
    await expect(service.list()).resolves.toStrictEqual([]);
    await expect(service.remove(created.id)).rejects.toThrow(NotFoundError);
  });

  it("changes only the fields an update carries", async () => {
    const service = new TimelineService(memoryStore());
    const created = await service.create(input);

    const updated = await service.update(created.id, { nameEn: "  Season 8 starts  " });

    expect(updated).toStrictEqual({ ...created, nameEn: "Season 8 starts" });
  });

  it("hides the internal id from the public entries", async () => {
    const service = new TimelineService(memoryStore());
    await service.create(input);

    await expect(service.publicEntries()).resolves.toStrictEqual([input]);
  });

  it("refuses an invalid entry and stores nothing", async () => {
    const service = new TimelineService(memoryStore());

    await expect(service.create({ ...input, date: "2023-02-30" })).rejects.toThrow(
      InvalidInputError,
    );
    await expect(service.create({ ...input, sourceUrl: "" })).rejects.toThrow(InvalidInputError);
    await expect(service.list()).resolves.toStrictEqual([]);
  });

  it("refuses to edit an unknown entry", async () => {
    const service = new TimelineService(memoryStore());

    await expect(service.update(UNKNOWN_ID, input)).rejects.toThrow(NotFoundError);
  });
});
