import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { MANUAL_STAGE_ID, memoryFactStore } from "../../../test/on-this-day-fixtures";
import { OnThisDayFactService } from "./on-this-day-fact.service";

const input = {
  day: 13,
  link: { id: MANUAL_STAGE_ID, kind: "tournament" as const },
  month: 11,
  sourceUrl: null,
  textEn: "The first RLCS season ended.",
  textFr: "La première saison des RLCS s'achevait.",
  year: 2016,
};

describe(OnThisDayFactService, () => {
  it("creates, edits and deletes a staff fact with its resolved link", async () => {
    const service = new OnThisDayFactService(memoryFactStore());

    const created = await service.create(input);
    expect(created).toMatchObject({
      day: 13,
      link: { id: MANUAL_STAGE_ID, kind: "tournament", name: "Playoffs", source: "manual" },
      month: 11,
    });

    const updated = await service.update(created.id, { ...input, link: null, year: null });
    expect(updated).toMatchObject({ id: created.id, link: null, year: null });
    await expect(service.list()).resolves.toHaveLength(1);

    await service.remove(created.id);
    await expect(service.list()).resolves.toStrictEqual([]);
    await expect(service.remove(created.id)).rejects.toThrow(NotFoundError);
  });

  it("refuses a link to a missing entity", async () => {
    const service = new OnThisDayFactService(memoryFactStore());

    await expect(
      service.create({ ...input, link: { id: MANUAL_STAGE_ID, kind: "player" } }),
    ).rejects.toThrow(InvalidInputError);
    await expect(service.list()).resolves.toStrictEqual([]);
  });

  it("refuses to edit an unknown fact", async () => {
    const service = new OnThisDayFactService(memoryFactStore());

    await expect(service.update(MANUAL_STAGE_ID, input)).rejects.toThrow(NotFoundError);
  });
});
