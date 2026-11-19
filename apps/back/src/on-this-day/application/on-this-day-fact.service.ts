import type { OnThisDayFact, OnThisDayFactInput } from "@sarpbc/types";
import { v4 } from "uuid";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { parseOnThisDayFact } from "../domain/on-this-day-fact";
import type { OnThisDayFactStore } from "./ports";

export class OnThisDayFactService {
  constructor(private readonly store: OnThisDayFactStore) {}

  async list() {
    return (await this.store.list()) satisfies OnThisDayFact[];
  }

  async create(input: OnThisDayFactInput) {
    return (await this.write(v4(), input)) satisfies OnThisDayFact;
  }

  async update(id: string, input: OnThisDayFactInput) {
    await this.require(id);

    return (await this.write(id, input)) satisfies OnThisDayFact;
  }

  async remove(id: string) {
    if (!(await this.store.remove(id))) {
      throw new NotFoundError("Fact not found");
    }
  }

  private async write(id: string, input: OnThisDayFactInput) {
    const fields = parseOnThisDayFact(input);

    if (fields.link && !(await this.store.linkExists(fields.link))) {
      throw new InvalidInputError(
        `No ${fields.link.kind} with id "${fields.link.id}"; link an existing, unmerged ${fields.link.kind}.`,
      );
    }

    await this.store.save(id, fields);

    return (await this.require(id)) satisfies OnThisDayFact;
  }

  private async require(id: string) {
    const fact = await this.store.find(id);

    if (!fact) {
      throw new NotFoundError("Fact not found");
    }

    return fact satisfies OnThisDayFact;
  }
}
