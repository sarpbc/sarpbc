import * as bcrypt from "bcrypt";

export const hashPassword = async (password: string): Promise<string> => {
  const saltOrRounds = 10;

  return await bcrypt.hash(password, saltOrRounds);
};

export const comparePasswordHash = async (password: string, hash: string): Promise<boolean> =>
  await bcrypt.compare(password, hash);
