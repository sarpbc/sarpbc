import { isNonEmptyDateInput } from "@sarpbc/utils";

export const formatDateForInput = (date: Date | string | null | undefined) => {
  if (!isNonEmptyDateInput(date)) {
    return "";
  }

  return new Date(date).toISOString().slice(0, 10);
};

const pad = (value: number) => String(value).padStart(2, "0");

/** The local `YYYY-MM-DDTHH:mm:ss` value a `datetime-local` input expects. */
export const formatDateTimeForInput = (date: Date | string | null | undefined) => {
  if (!isNonEmptyDateInput(date)) {
    return "";
  }

  const value = new Date(date);
  const day = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;

  return `${day}T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
};
