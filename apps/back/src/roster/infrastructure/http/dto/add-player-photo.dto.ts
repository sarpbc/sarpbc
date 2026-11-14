import { z } from "zod";

export const AddPlayerPhotoDto = z.strictObject({
  url: z.url({ protocol: /^(?:https?|ftp)$/ }),
});

export type AddPlayerPhotoInput = z.infer<typeof AddPlayerPhotoDto>;
