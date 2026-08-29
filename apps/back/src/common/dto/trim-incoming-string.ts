import * as z from "zod";

export function trimIncomingString({
  value,
}: {
  value: string | number | boolean | null | undefined;
}) {
  const parsed = z.string().safeParse(value);
  return parsed.success ? parsed.data.trim() : value;
}
