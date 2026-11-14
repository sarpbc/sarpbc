import { InvalidInputError } from "../../../common/domain/errors/invalid-input-error";

type UpdateFieldValue = string | number | boolean | null | undefined | readonly (object | string)[];

export const requireUpdateFields = (fields: Readonly<Record<string, UpdateFieldValue>>): void => {
  if (Object.values(fields).every((value) => value === undefined)) {
    throw new InvalidInputError(
      `Provide at least one field to update (${Object.keys(fields).join(", ")}).`,
    );
  }
};
