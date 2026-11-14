import { isNonEmptyDateInput } from "@sarpbc/utils";

export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!isNonEmptyDateInput(date)) {
    return "";
  }

  return new Date(date).toISOString().substring(0, 10);
}
