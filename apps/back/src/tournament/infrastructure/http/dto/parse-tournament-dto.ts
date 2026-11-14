import { BadRequestException } from "@nestjs/common";
import { z } from "zod";

export const parseDto = <T, Input>(schema: z.ZodType<T, Input>, input: Input): T => {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new BadRequestException(result.error.issues.map((issue) => issue.message));
  }

  return result.data;
};
