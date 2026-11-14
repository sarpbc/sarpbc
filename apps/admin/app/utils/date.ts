import { isNonEmptyDateInput } from "@sarpbc/utils";

export const formatDateForInput = (date: Date | string | null | undefined): string => {
  if (!isNonEmptyDateInput(date)) {
    return "";
  }

  return new Date(date).toISOString().slice(0, 10);
};
