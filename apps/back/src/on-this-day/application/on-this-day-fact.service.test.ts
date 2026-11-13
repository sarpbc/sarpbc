import { describe, expect, it } from "vitest";
import { InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { MANUAL_STAGE_ID, memoryFactStore } from "../../../test/on-this-day-fixtures";
import { OnThisDayFactService } from "./on-this-day-fact.service";

const input = {
  month: 11,
  day: 13,
  year: 2016,
  textEn: "The first RLCS season ended.",
  textFr: "La première saison des RLCS s'achevait.",
  link: { kind: "tournament" as const, id: MANUAL_STAGE_ID },
  sourceUrl: null,
};

describe("OnThisDayFactService", () => {
  it("creates, edits and deletes a staff fact with its resolved link", async () => {
    const service = new OnThisDayFactService(memoryFactStore());

    const created = await service.create(input);
    expect(created).toMatchObject({
      month: 11,
      day: 13,
      link: { kind: "tournament", id: MANUAL_STAGE_ID, name: "Playoffs", source: "manual" },
    });

    const updated = await service.update(created.id, { ...input, link: null, year: null });
    expect(updated).toMatchObject({ id: created.id, year: null, link: null });
    expect(await service.list()).toHaveLength(1);

    await service.remove(created.id);
    expect(await service.list()).toEqual([]);
    await expect(service.remove(created.id)).rejects.toThrow(NotFoundError);
  });

  it("refuses a link to a missing entity", async () => {
    const service = new OnThisDayFactService(memoryFactStore());

    await expect(
      service.create({ ...input, link: { kind: "player", id: MANUAL_STAGE_ID } }),
    ).rejects.toThrow(InvalidInputError);
    expect(await service.list()).toEqual([]);
  });

  it("refuses to edit an unknown fact", async () => {
    const service = new OnThisDayFactService(memoryFactStore());

    await expect(service.update(MANUAL_STAGE_ID, input)).rejects.toThrow(NotFoundError);
  });
});
