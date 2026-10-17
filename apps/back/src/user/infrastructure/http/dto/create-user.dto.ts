import { z } from "zod";

export const CreateUserDto = z.strictObject({
  email: z.email(),
  password: z.string().min(8).max(100),
  userName: z.string().min(1).max(100),
});

export type CreateUserDto = z.infer<typeof CreateUserDto>;
