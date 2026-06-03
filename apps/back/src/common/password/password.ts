import * as bcrypt from "bcrypt";

export async function hashPassword(password: string): Promise<string> {
  const saltOrRounds = 10;
  return await bcrypt.hash(password, saltOrRounds);
}

export async function comparePasswordHash(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
