import type { OnThisDayFact, OnThisDayFactInput } from "@sarpbc/types";
import { v4 } from "uuid";
import { InvalidInputError, NotFoundError } from "../../common/domain/errors";
import { parseOnThisDayFact } from "../domain/on-this-day-fact";
import type { OnThisDayFactStore } from "./ports";

export class OnThisDayFactService {
  constructor(private readonly store: OnThisDayFactStore) {}

  list(): Promise<OnThisDayFact[]> {
    return this.store.list();
  }

  create(input: OnThisDayFactInput): Promise<OnThisDayFact> {
    return this.write(v4(), input);
  }

  async update(id: string, input: OnThisDayFactInput): Promise<OnThisDayFact> {
    await this.require(id);

    return this.write(id, input);
  }

  async remove(id: string): Promise<void> {
    if (!(await this.store.remove(id))) throw new NotFoundError("Fact not found");
  }

  private async write(id: string, input: OnThisDayFactInput): Promise<OnThisDayFact> {
    const fields = parseOnThisDayFact(input);

    if (fields.link && !(await this.store.linkExists(fields.link)))
      throw new InvalidInputError(
        `No ${fields.link.kind} with id "${fields.link.id}"; link an existing, unmerged ${fields.link.kind}.`,
      );
    await this.store.save(id, fields);

    return this.require(id);
  }

  private async require(id: string): Promise<OnThisDayFact> {
    const fact = await this.store.find(id);

    if (!fact) throw new NotFoundError("Fact not found");

    return fact;
  }
}
