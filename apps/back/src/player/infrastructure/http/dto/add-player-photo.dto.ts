import { z } from "zod";

export const AddPlayerPhotoDto = z.strictObject({
  url: z.url({ protocol: /^(https?|ftp)$/ }),
});

export type AddPlayerPhotoDto = z.infer<typeof AddPlayerPhotoDto>;
