import { BadRequestException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

export async function parseDto<T extends object>(
  DtoClass: new () => T,
  plain: Record<string, unknown>,
): Promise<T> {
  const dto = plainToInstance(DtoClass, plain);
  const errors = await validate(dto as object, {
    whitelist: true,
    forbidUnknownValues: false,
  });
  if (errors.length === 0) {
    return dto;
  }

  const messages = errors.flatMap((error) => Object.values(error.constraints ?? {}));
  throw new BadRequestException(
    messages.length > 0 ? messages.join(" ") : "Validation failed for tournament input.",
  );
}
