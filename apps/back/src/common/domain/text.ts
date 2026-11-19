export const nonBlank = (value: string | null | undefined) => {
  const trimmed = value?.trim();

  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
};
