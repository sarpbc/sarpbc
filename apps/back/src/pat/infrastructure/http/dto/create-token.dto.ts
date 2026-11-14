import { z } from "zod";
import { TOKEN_NAME_MAX_LENGTH } from "@sarpbc/utils";

export const CreateTokenDto = z.strictObject({
  name: z.string().trim().min(1).max(TOKEN_NAME_MAX_LENGTH),
});

export type CreateTokenInput = z.infer<typeof CreateTokenDto>;
