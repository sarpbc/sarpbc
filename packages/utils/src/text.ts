export function isNonEmptyString(value: string | null | undefined): value is string {
  return value !== undefined && value !== null && value !== "";
}

export function isNonEmptyDateInput(
  value: Date | string | null | undefined,
): value is Date | string {
  return value !== undefined && value !== null && value !== "";
}
