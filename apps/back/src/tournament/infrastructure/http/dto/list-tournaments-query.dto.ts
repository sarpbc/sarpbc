import { z } from "zod";
import { OffsetPaginationQueryDto } from "../../../../common/infrastructure/http/dto/offset-pagination-query.dto";

const optionalBoolean = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z
    .union([z.boolean(), z.enum(["true", "false"]).transform((value) => value === "true")])
    .optional(),
);

export const ListTournamentsQueryDto = OffsetPaginationQueryDto.extend({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  pickems: optionalBoolean,
  activeOnly: optionalBoolean,
});
export type ListTournamentsQueryDto = z.infer<typeof ListTournamentsQueryDto>;
