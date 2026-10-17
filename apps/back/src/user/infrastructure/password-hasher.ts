import { comparePasswordHash, hashPassword } from "./password/password";
import type { PasswordHasher } from "../application/ports/password-hasher";

export const passwordHasher: PasswordHasher = {
  hash: hashPassword,
  compare: comparePasswordHash,
};
