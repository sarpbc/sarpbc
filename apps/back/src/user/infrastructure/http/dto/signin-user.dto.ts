import { z } from "zod";

export const SignInUserDto = z.strictObject({
  email: z.email(),
  password: z.string().min(1),
});

export type SignInUserDto = z.infer<typeof SignInUserDto>;
