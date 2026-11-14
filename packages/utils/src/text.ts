export const isNonEmptyString = (value: string | null | undefined): value is string =>
  value !== undefined && value !== null && value !== "";

export const isNonEmptyDateInput = (
  value: Date | string | null | undefined,
): value is Date | string => value !== undefined && value !== null && value !== "";
