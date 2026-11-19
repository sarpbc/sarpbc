import * as bcrypt from "bcrypt";

export const hashPassword = async (password: string) => {
  const saltOrRounds = 10;

  return await bcrypt.hash(password, saltOrRounds);
};

export const comparePasswordHash = async (password: string, hash: string) =>
  await bcrypt.compare(password, hash);
