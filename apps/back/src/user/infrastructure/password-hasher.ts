import { comparePasswordHash, hashPassword } from "./password/password";
import type { PasswordHasher } from "../application/ports/password-hasher";

export const passwordHasher: PasswordHasher = {
  compare: comparePasswordHash,
  hash: hashPassword,
};
